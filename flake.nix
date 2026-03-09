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
        packages.default = pkgs.fetchFirefoxAddon {
          name = "kotdiff";
          url = "${baseUrl}/kotdiff-firefox-v${version}.xpi";
          hash = "sha256-6WnIcWIbH+r0qLc6SWzmE6QPn5OEPocxDxr19LwrYlU=";
          fixedExtid = "kotdiff@example.com";
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
