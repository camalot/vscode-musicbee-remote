#!/bin/bash
declare -A colors
colors["amber"]="#402500 #FF9400"
colors["cyan"]="#003340 #00CCFF"
colors["green"]="#034000 #0BFF00"
colors["red"]="#401200 #FF3600"
colors["white"]="#3B3B3B #FAFAFA"
colors["yellow"]="#403500 #FFD300"

for name in "${!colors[@]}"; do
  read -r bg fg <<< "${colors[$name]}"
  
  # _sass file
  cat << SCSS > "docs/_sass/color_schemes/mono-${name}.scss"
\$mono-bg: ${bg};
\$mono-fg: ${fg};
@import "mono-generator";
SCSS
done

