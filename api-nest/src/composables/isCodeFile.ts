const CODE_MIMETYPES = new Set([
  // JavaScript / TypeScript
  'application/javascript', 'application/x-javascript', 'application/ecmascript',
  'application/typescript', 'application/x-typescript',
  // Data & config
  'application/json', 'application/ld+json', 'application/json5',
  'application/xml', 'application/xhtml+xml', 'application/rss+xml', 'application/atom+xml',
  'application/x-yaml', 'application/yaml',
  'application/toml', 'application/x-toml',
  'application/graphql',
  'application/x-protobuf',
  // Shell & scripting
  'application/x-sh', 'application/x-csh', 'application/x-zsh',
  'application/x-bash', 'application/x-fish',
  'application/x-perl', 'application/x-python', 'application/x-ruby',
  'application/x-php', 'application/x-httpd-php',
  'application/x-lua', 'application/x-tcl', 'application/x-awk',
  // Systems
  'application/x-java-source', 'application/x-groovy', 'application/x-scala',
  'application/x-kotlin', 'application/x-swift', 'application/x-go',
  'application/x-rust', 'application/x-c', 'application/x-c++',
  'application/x-objc', 'application/x-fortran', 'application/x-cobol',
  'application/x-ada', 'application/x-pascal', 'application/x-haskell',
  'application/x-clojure', 'application/x-erlang', 'application/x-elixir',
  'application/x-julia', 'application/x-dart', 'application/x-nim',
  'application/x-zig', 'application/x-crystal', 'application/x-ocaml',
  'application/x-fsharp', 'application/x-powershell',
  // Misc
  'application/wasm',
]);

const CODE_EXTENSIONS = /\.(html?|css|s[ac]ss|less|styl|js|mjs|cjs|jsx|ts|tsx|vue|svelte|astro|ejs|pug|hbs|handlebars|twig|liquid|mustache|njk|py|pyw|pyi|rb|php|java|cs|csx|go|rs|swift|kt|kts|groovy|gradle|scala|sbt|clj|cljs|cljc|edn|hs|lhs|ml|mli|fs|fsx|fsi|ex|exs|erl|hrl|lua|pl|pm|t|r|jl|dart|nim|zig|cr|elm|purs|c|cc|cpp|cxx|h|hpp|hxx|m|mm|asm|s|f|f90|f95|f03|f08|for|ftn|cob|cbl|ada|adb|ads|pas|sh|bash|zsh|fish|ps1|psm1|psd1|bat|cmd|vbs|wsf|tcl|awk|sed|json|json5|jsonc|ya?ml|toml|ini|cfg|conf|env|properties|xml|xsl|xslt|dtd|xsd|svg|wsdl|graphql|gql|proto|thrift|avro|idl|sql|ddl|dml|pgsql|plsql|tsql|sqlite|md|mdx|rst|adoc|asciidoc|tex|latex|bib|org|pod|tf|tfvars|hcl|prisma|sol|coffee|litcoffee|wat|wasm|txt|csv|log|diff|patch|makefile|mk|cmake|dockerfile|vagrantfile|rakefile|gemfile|podfile|lock|sum|mod)$/i;

export function isCodeFile(mimetype: string | undefined, fileName: string): boolean {
  return (
    (mimetype?.startsWith('text/') ?? false) ||
    CODE_MIMETYPES.has(mimetype ?? '') ||
    CODE_EXTENSIONS.test(fileName)
  );
}
