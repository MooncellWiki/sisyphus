// Package sisyphus contains the version number of sisyphus.
package sisyphus

import "time"

// Version is the current version of sisyphus.
//
// This variable is set at build time using the -X linker flag. If not set,
// it defaults to "devel".
var Version = "devel"

// CookieName is the name of the cookie that sisyphus uses in order to validate
// access.
const CookieName = "within.website-x-cmd-sisyphus-auth"

// CookieDefaultExpirationTime is the amount of time before the cookie/JWT expires.
const CookieDefaultExpirationTime = 7 * 24 * time.Hour

// BasePrefix is a global prefix for all sisyphus endpoints. Can be emptied to remove the prefix entirely.
var BasePrefix = ""

// StaticPath is the location where all static sisyphus assets are located.
const StaticPath = "/.within.website/x/cmd/sisyphus/"

// APIPrefix is the location where all sisyphus API endpoints are located.
const APIPrefix = "/.within.website/x/cmd/sisyphus/api/"

// DefaultDifficulty is the default "difficulty" (number of leading zeroes)
// that must be met by the client in order to pass the challenge.
const DefaultDifficulty = 4
