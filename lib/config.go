package lib

import (
	"crypto/ed25519"
	"crypto/rand"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/MooncellWiki/sisyphus"
	"github.com/MooncellWiki/sisyphus/data"
	"github.com/MooncellWiki/sisyphus/decaymap"
	"github.com/MooncellWiki/sisyphus/internal"
	"github.com/MooncellWiki/sisyphus/internal/dnsbl"
	"github.com/MooncellWiki/sisyphus/internal/ogtags"
	"github.com/MooncellWiki/sisyphus/lib/policy"
	"github.com/MooncellWiki/sisyphus/web"
)

type Options struct {
	Next            http.Handler
	Policy          *policy.ParsedConfig
	RedirectDomains []string
	ServeRobotsTXT  bool
	PrivateKey      ed25519.PrivateKey

	CookieExpiration  time.Duration
	CookieDomain      string
	CookieName        string
	CookiePartitioned bool

	OGPassthrough        bool
	OGTimeToLive         time.Duration
	OGCacheConsidersHost bool
	Target               string

	WebmasterEmail string
	BasePrefix     string
}

func LoadPoliciesOrDefault(fname string, defaultDifficulty int) (*policy.ParsedConfig, error) {
	var fin io.ReadCloser
	var err error

	if fname != "" {
		fin, err = os.Open(fname)
		if err != nil {
			return nil, fmt.Errorf("can't parse policy file %s: %w", fname, err)
		}
	} else {
		fname = "(data)/botPolicies.yaml"
		fin, err = data.BotPolicies.Open("botPolicies.yaml")
		if err != nil {
			return nil, fmt.Errorf("[unexpected] can't parse builtin policy file %s: %w", fname, err)
		}
	}

	defer func(fin io.ReadCloser) {
		err := fin.Close()
		if err != nil {
			slog.Error("failed to close policy file", "file", fname, "err", err)
		}
	}(fin)

	sisyphusPolicy, err := policy.ParseConfig(fin, fname, defaultDifficulty)

	return sisyphusPolicy, err
}

func New(opts Options) (*Server, error) {
	if opts.PrivateKey == nil {
		slog.Debug("opts.PrivateKey not set, generating a new one")
		_, priv, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			return nil, fmt.Errorf("lib: can't generate private key: %v", err)
		}
		opts.PrivateKey = priv
	}

	sisyphus.BasePrefix = opts.BasePrefix

	result := &Server{
		next:       opts.Next,
		priv:       opts.PrivateKey,
		pub:        opts.PrivateKey.Public().(ed25519.PublicKey),
		policy:     opts.Policy,
		opts:       opts,
		DNSBLCache: decaymap.New[string, dnsbl.DroneBLResponse](),
		OGTags:     ogtags.NewOGTagCache(opts.Target, opts.OGPassthrough, opts.OGTimeToLive, opts.OGCacheConsidersHost),
	}

	mux := http.NewServeMux()

	// Helper to add global prefix
	registerWithPrefix := func(pattern string, handler http.Handler, method string) {
		if method != "" {
			method = method + " " // methods must end with a space to register with them
		}

		// Ensure there's no double slash when concatenating BasePrefix and pattern
		basePrefix := strings.TrimSuffix(sisyphus.BasePrefix, "/")
		prefix := method + basePrefix

		// If pattern doesn't start with a slash, add one
		if !strings.HasPrefix(pattern, "/") {
			pattern = "/" + pattern
		}

		mux.Handle(prefix+pattern, handler)
	}

	// Ensure there's no double slash when concatenating BasePrefix and StaticPath
	stripPrefix := strings.TrimSuffix(sisyphus.BasePrefix, "/") + sisyphus.StaticPath
	registerWithPrefix(sisyphus.StaticPath, internal.UnchangingCache(internal.NoBrowsing(http.StripPrefix(stripPrefix, http.FileServerFS(web.Static)))), "")

	if opts.ServeRobotsTXT {
		registerWithPrefix("/robots.txt", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.ServeFileFS(w, r, web.Static, "static/robots.txt")
		}), "GET")
		registerWithPrefix("/.well-known/robots.txt", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.ServeFileFS(w, r, web.Static, "static/robots.txt")
		}), "GET")
	}

	registerWithPrefix(sisyphus.APIPrefix+"make-challenge", http.HandlerFunc(result.MakeChallenge), "POST")
	registerWithPrefix(sisyphus.APIPrefix+"pass-challenge", http.HandlerFunc(result.PassChallenge), "GET")
	registerWithPrefix(sisyphus.APIPrefix+"check", http.HandlerFunc(result.maybeReverseProxyHttpStatusOnly), "")
	registerWithPrefix(sisyphus.APIPrefix+"test-error", http.HandlerFunc(result.TestError), "GET")
	registerWithPrefix("/", http.HandlerFunc(result.maybeReverseProxyOrPage), "")

	result.mux = mux

	return result, nil
}
