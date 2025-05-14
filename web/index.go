package web

import (
	"github.com/a-h/templ"

	"github.com/MooncellWiki/sisyphus/lib/policy/config"
)

func Base(title string, body templ.Component) templ.Component {
	return base(title, nil, nil)
}

func BaseWithChallengeAndOGTags(title string, body templ.Component, challenge string, rules *config.ChallengeRules, ogTags map[string]string) (templ.Component, error) {
	return base(title, struct {
		Challenge string                 `json:"challenge"`
		Rules     *config.ChallengeRules `json:"rules"`
	}{
		Challenge: challenge,
		Rules:     rules,
	}, ogTags), nil
}

func Index() templ.Component {
	return nil
}

func ErrorPage(msg string, mail string, helpLink string) templ.Component {
	return errorPage(msg, mail, helpLink)
}

func Bench() templ.Component {
	return nil
}
