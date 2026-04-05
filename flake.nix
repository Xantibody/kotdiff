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
      version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
      baseUrl = "https://github.com/Xantibody/kotdiff/releases/download/v${version}";
    in
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages.default =
          let
            src = pkgs.fetchFirefoxAddon {
              name = "kotdiff";
              url = "${baseUrl}/kotdiff-firefox-v${version}.xpi";
              hash = "sha256-tCzdiLU5urEFrmz0YnoTTX6jT98rHe4ni1lXboOQ/zc=";
              fixedExtid = "kotdiff@example.com";
            };
          in
          pkgs.stdenv.mkDerivation {
            name = "kotdiff-${version}";
            dontUnpack = true;
            installPhase = ''
              install -D "${src}/kotdiff@example.com.xpi" \
                "$out/share/mozilla/extensions/{ec8030f7-c20a-464f-9b0e-13a3a9e97384}/kotdiff@example.com.xpi"
            '';
            passthru = {
              addonId = "kotdiff@example.com";
              inherit (src) extid;
            };
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
