{
  description = "KingOfTime Diff Chrome/Firefox Extension";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      ...
    }:
    let
      # NOTE: url and hash are auto-updated by .github/workflows/update-flake-amo.yml
      amoUrl = "https://addons.mozilla.org/firefox/downloads/file/4754132/kotdiff-1.6.1.xpi";
      amoHash = "sha256-7aEFX3I4NlAeXEyogQbCy9LPPU2oDDcx70sltQ/CxpA=";
    in
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages.default = pkgs.stdenv.mkDerivation {
          name = "kotdiff-firefox-xpi";

          src = pkgs.fetchurl {
            url = amoUrl;
            hash = amoHash;
          };

          passthru.addonId = "kotdiff@example.com";

          preferLocalBuild = true;
          allowSubstitutes = true;

          buildCommand = ''
            dst="$out/share/mozilla/extensions/{ec8030f7-c20a-464f-9b0e-13a3a9e97384}"
            mkdir -p "$dst"
            install -v -m644 "$src" "$dst/kotdiff@example.com.xpi"
          '';
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            pnpm
            typescript
            typescript-go
            oxlint
            oxfmt
          ];
        };
      }
    );
}
