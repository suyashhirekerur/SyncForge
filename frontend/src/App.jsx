import "./App.css";
import io from "socket.io-client";
import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from "@monaco-editor/react"

// Dynamically resolve the backend socket server URL
const getSocketUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  const { protocol, hostname, port } = window.location;

  // If running on Vite's default dev server port, connect to backend on port 5000
  if (port === "5173") {
    return `${protocol}//${hostname}:5000`;
  }

  // Default to serving origin (e.g. production/built serving)
  return window.location.origin;
};

const socket = io(getSocketUrl());

const LANGUAGE_EXTENSIONS = {
  javascript: ".js",
  typescript: ".ts",
  cpp: ".cpp",
  python: ".py",
  java: ".java",
  csharp: ".cs",
  go: ".go",
  rust: ".rs",
  html: ".html",
  css: ".css",
};

const LANGUAGE_COMMENTS = {
  javascript: "// Start writing your code from here...",
  typescript: "// Start writing your code from here...",
  cpp: "// Start writing your code from here...",
  python: "# Start writing your code from here...",
  java: "// Start writing your code from here...",
  csharp: "// Start writing your code from here...",
  go: "// Start writing your code from here...",
  rust: "// Start writing your code from here...",
  html: "<!-- Start writing your code from here... -->",
  css: "/* Start writing your code from here... */",
};

const getDefaultCode = (lang) =>
  LANGUAGE_COMMENTS[lang] || "// Start writing your code from here...";

const ALL_DEFAULTS = new Set(Object.values(LANGUAGE_COMMENTS));

const CURSOR_COLORS = [
  "#f97316",
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#facc15",
];

const LANGUAGE_COMPLETIONS = {
  python: {
    keywords: [
      "False", "None", "True", "and", "as", "assert", "async", "await",
      "break", "class", "continue", "def", "del", "elif", "else", "except",
      "finally", "for", "from", "global", "if", "import", "in", "is",
      "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try",
      "while", "with", "yield",
    ],
    builtins: [
      "print", "len", "range", "int", "str", "float", "list", "dict",
      "set", "tuple", "bool", "input", "open", "type", "isinstance",
      "enumerate", "zip", "map", "filter", "sorted", "reversed", "abs",
      "max", "min", "sum", "any", "all", "round", "format", "super",
      "property", "staticmethod", "classmethod", "hasattr", "getattr",
      "setattr", "delattr", "vars", "dir", "help", "id", "hash", "hex",
      "oct", "bin", "ord", "chr", "repr", "eval", "exec", "compile",
      "globals", "locals", "iter", "next", "slice", "object",
    ],
    snippets: [
      { label: "def", insertText: "def ${1:function_name}(${2:params}):\n    ${3:pass}", detail: "Function definition" },
      { label: "class", insertText: "class ${1:ClassName}:\n    def __init__(self${2:, params}):\n        ${3:pass}", detail: "Class definition" },
      { label: "if", insertText: "if ${1:condition}:\n    ${2:pass}", detail: "If statement" },
      { label: "if-else", insertText: "if ${1:condition}:\n    ${2:pass}\nelse:\n    ${3:pass}", detail: "If-else statement" },
      { label: "for", insertText: "for ${1:item} in ${2:iterable}:\n    ${3:pass}", detail: "For loop" },
      { label: "while", insertText: "while ${1:condition}:\n    ${2:pass}", detail: "While loop" },
      { label: "try-except", insertText: "try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:pass}", detail: "Try-except block" },
      { label: "with", insertText: "with ${1:expression} as ${2:var}:\n    ${3:pass}", detail: "With statement" },
      { label: "list-comp", insertText: "[${1:expr} for ${2:item} in ${3:iterable}]", detail: "List comprehension" },
      { label: "lambda", insertText: "lambda ${1:args}: ${2:expression}", detail: "Lambda function" },
      { label: "main", insertText: 'if __name__ == "__main__":\n    ${1:main()}', detail: "Main guard" },
      { label: "import", insertText: "import ${1:module}", detail: "Import module" },
      { label: "from-import", insertText: "from ${1:module} import ${2:name}", detail: "From import" },
    ],
  },
  cpp: {
    keywords: [
      "auto", "break", "case", "catch", "class", "const", "constexpr",
      "continue", "default", "delete", "do", "double", "else", "enum",
      "explicit", "extern", "false", "float", "for", "friend", "goto",
      "if", "inline", "int", "long", "mutable", "namespace", "new",
      "nullptr", "operator", "private", "protected", "public", "register",
      "return", "short", "signed", "sizeof", "static", "struct", "switch",
      "template", "this", "throw", "true", "try", "typedef", "typeid",
      "typename", "union", "unsigned", "using", "virtual", "void",
      "volatile", "while", "bool", "char", "wchar_t", "string",
    ],
    builtins: [
      "cout", "cin", "endl", "vector", "map", "set", "unordered_map",
      "unordered_set", "pair", "stack", "queue", "deque", "priority_queue",
      "array", "list", "forward_list", "bitset", "sort", "find",
      "begin", "end", "push_back", "pop_back", "size", "empty",
      "insert", "erase", "clear", "swap", "reverse", "unique",
      "lower_bound", "upper_bound", "binary_search", "min_element",
      "max_element", "accumulate", "to_string", "stoi", "stod",
      "getline", "substr", "length", "printf", "scanf",
    ],
    snippets: [
      { label: "#include", insertText: "#include <${1:iostream}>", detail: "Include header" },
      { label: "main", insertText: '#include <iostream>\nusing namespace std;\n\nint main() {\n    ${1:// code}\n    return 0;\n}', detail: "Main function" },
      { label: "for", insertText: "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    ${3:// body}\n}", detail: "For loop" },
      { label: "for-range", insertText: "for (auto& ${1:item} : ${2:container}) {\n    ${3:// body}\n}", detail: "Range-based for" },
      { label: "class", insertText: "class ${1:ClassName} {\npublic:\n    ${1:ClassName}() {}\n    ~${1:ClassName}() {}\nprivate:\n    ${2:// members}\n};", detail: "Class definition" },
      { label: "if", insertText: "if (${1:condition}) {\n    ${2:// body}\n}", detail: "If statement" },
      { label: "if-else", insertText: "if (${1:condition}) {\n    ${2:// body}\n} else {\n    ${3:// body}\n}", detail: "If-else" },
      { label: "while", insertText: "while (${1:condition}) {\n    ${2:// body}\n}", detail: "While loop" },
      { label: "switch", insertText: "switch (${1:expr}) {\n    case ${2:val}:\n        ${3:// code}\n        break;\n    default:\n        ${4:// code}\n        break;\n}", detail: "Switch statement" },
      { label: "struct", insertText: "struct ${1:Name} {\n    ${2:// members}\n};", detail: "Struct definition" },
      { label: "cout", insertText: 'cout << ${1:"text"} << endl;', detail: "Print to console" },
      { label: "vector", insertText: "vector<${1:int}> ${2:vec};", detail: "Vector declaration" },
    ],
  },
  java: {
    keywords: [
      "abstract", "assert", "boolean", "break", "byte", "case", "catch",
      "char", "class", "const", "continue", "default", "do", "double",
      "else", "enum", "extends", "final", "finally", "float", "for",
      "goto", "if", "implements", "import", "instanceof", "int",
      "interface", "long", "native", "new", "package", "private",
      "protected", "public", "return", "short", "static", "strictfp",
      "super", "switch", "synchronized", "this", "throw", "throws",
      "transient", "try", "void", "volatile", "while", "var", "record",
      "sealed", "permits", "yield", "String", "Integer", "Double",
      "Boolean", "Object", "List", "Map", "Set", "ArrayList", "HashMap",
    ],
    builtins: [
      "System.out.println", "System.out.print", "System.err.println",
      "toString", "equals", "hashCode", "compareTo", "length", "charAt",
      "substring", "indexOf", "contains", "replace", "split", "trim",
      "toUpperCase", "toLowerCase", "valueOf", "parseInt", "parseDouble",
      "add", "remove", "get", "put", "size", "isEmpty", "clear",
      "iterator", "stream", "forEach", "map", "filter", "collect",
      "Arrays.sort", "Collections.sort", "Math.max", "Math.min",
      "Math.abs", "Math.pow", "Math.sqrt", "Math.random",
    ],
    snippets: [
      { label: "main", insertText: "public static void main(String[] args) {\n    ${1:// code}\n}", detail: "Main method" },
      { label: "sout", insertText: "System.out.println(${1:});", detail: "Print line" },
      { label: "class", insertText: "public class ${1:ClassName} {\n    ${2:// fields}\n\n    public ${1:ClassName}() {\n        ${3:// constructor}\n    }\n}", detail: "Class definition" },
      { label: "for", insertText: "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    ${3:// body}\n}", detail: "For loop" },
      { label: "foreach", insertText: "for (${1:Type} ${2:item} : ${3:collection}) {\n    ${4:// body}\n}", detail: "Enhanced for loop" },
      { label: "if", insertText: "if (${1:condition}) {\n    ${2:// body}\n}", detail: "If statement" },
      { label: "if-else", insertText: "if (${1:condition}) {\n    ${2:// body}\n} else {\n    ${3:// body}\n}", detail: "If-else" },
      { label: "try-catch", insertText: "try {\n    ${1:// code}\n} catch (${2:Exception} ${3:e}) {\n    ${4:e.printStackTrace();}\n}", detail: "Try-catch block" },
      { label: "while", insertText: "while (${1:condition}) {\n    ${2:// body}\n}", detail: "While loop" },
      { label: "switch", insertText: "switch (${1:expr}) {\n    case ${2:val}:\n        ${3:// code}\n        break;\n    default:\n        ${4:// code}\n        break;\n}", detail: "Switch statement" },
      { label: "interface", insertText: "public interface ${1:Name} {\n    ${2:// methods}\n}", detail: "Interface" },
    ],
  },
  csharp: {
    keywords: [
      "abstract", "as", "base", "bool", "break", "byte", "case", "catch",
      "char", "checked", "class", "const", "continue", "decimal",
      "default", "delegate", "do", "double", "else", "enum", "event",
      "explicit", "extern", "false", "finally", "fixed", "float", "for",
      "foreach", "goto", "if", "implicit", "in", "int", "interface",
      "internal", "is", "lock", "long", "namespace", "new", "null",
      "object", "operator", "out", "override", "params", "private",
      "protected", "public", "readonly", "ref", "return", "sbyte",
      "sealed", "short", "sizeof", "static", "string", "struct",
      "switch", "this", "throw", "true", "try", "typeof", "uint",
      "ulong", "unchecked", "unsafe", "ushort", "using", "var",
      "virtual", "void", "volatile", "while", "async", "await",
      "record", "init", "with", "yield", "dynamic",
    ],
    builtins: [
      "Console.WriteLine", "Console.ReadLine", "Console.Write",
      "ToString", "Equals", "GetHashCode", "GetType", "CompareTo",
      "Add", "Remove", "Contains", "Count", "Clear", "ToList",
      "ToArray", "Where", "Select", "OrderBy", "FirstOrDefault",
      "Any", "All", "Sum", "Max", "Min", "Average", "GroupBy",
      "String.Format", "String.IsNullOrEmpty", "String.Join",
      "Math.Max", "Math.Min", "Math.Abs", "Math.Pow", "Math.Sqrt",
      "int.Parse", "int.TryParse", "Convert.ToInt32", "Convert.ToString",
    ],
    snippets: [
      { label: "main", insertText: "static void Main(string[] args)\n{\n    ${1:// code}\n}", detail: "Main method" },
      { label: "cw", insertText: "Console.WriteLine(${1:});", detail: "Console.WriteLine" },
      { label: "class", insertText: "public class ${1:ClassName}\n{\n    ${2:// members}\n}", detail: "Class definition" },
      { label: "for", insertText: "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++)\n{\n    ${3:// body}\n}", detail: "For loop" },
      { label: "foreach", insertText: "foreach (var ${1:item} in ${2:collection})\n{\n    ${3:// body}\n}", detail: "Foreach loop" },
      { label: "if", insertText: "if (${1:condition})\n{\n    ${2:// body}\n}", detail: "If statement" },
      { label: "try-catch", insertText: "try\n{\n    ${1:// code}\n}\ncatch (${2:Exception} ${3:ex})\n{\n    ${4:// handle}\n}", detail: "Try-catch" },
      { label: "prop", insertText: "public ${1:string} ${2:Name} { get; set; }", detail: "Auto property" },
      { label: "interface", insertText: "public interface ${1:IName}\n{\n    ${2:// members}\n}", detail: "Interface" },
      { label: "async-method", insertText: "public async Task${1:<T>} ${2:MethodName}(${3:})\n{\n    ${4:// body}\n}", detail: "Async method" },
    ],
  },
  go: {
    keywords: [
      "break", "case", "chan", "const", "continue", "default", "defer",
      "else", "fallthrough", "for", "func", "go", "goto", "if", "import",
      "interface", "map", "package", "range", "return", "select", "struct",
      "switch", "type", "var", "bool", "byte", "complex64", "complex128",
      "error", "float32", "float64", "int", "int8", "int16", "int32",
      "int64", "rune", "string", "uint", "uint8", "uint16", "uint32",
      "uint64", "uintptr", "true", "false", "nil", "iota", "append",
      "cap", "close", "copy", "delete", "len", "make", "new", "panic",
      "print", "println", "recover",
    ],
    builtins: [
      "fmt.Println", "fmt.Printf", "fmt.Sprintf", "fmt.Fprintf",
      "fmt.Errorf", "fmt.Scan", "fmt.Scanf", "strings.Contains",
      "strings.Split", "strings.Join", "strings.Replace", "strings.Trim",
      "strconv.Itoa", "strconv.Atoi", "sort.Ints", "sort.Strings",
      "sort.Slice", "math.Max", "math.Min", "math.Abs", "math.Sqrt",
      "os.Open", "os.Create", "os.Exit", "io.ReadAll", "json.Marshal",
      "json.Unmarshal", "http.Get", "http.ListenAndServe",
      "log.Println", "log.Fatal", "errors.New", "context.Background",
    ],
    snippets: [
      { label: "main", insertText: 'package main\n\nimport "fmt"\n\nfunc main() {\n    ${1:fmt.Println("Hello")}\n}', detail: "Main package" },
      { label: "func", insertText: "func ${1:name}(${2:params}) ${3:returnType} {\n    ${4:// body}\n}", detail: "Function" },
      { label: "if", insertText: "if ${1:condition} {\n    ${2:// body}\n}", detail: "If statement" },
      { label: "if-err", insertText: "if err != nil {\n    ${1:return err}\n}", detail: "Error check" },
      { label: "for", insertText: "for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n    ${3:// body}\n}", detail: "For loop" },
      { label: "for-range", insertText: "for ${1:i}, ${2:v} := range ${3:collection} {\n    ${4:// body}\n}", detail: "Range loop" },
      { label: "struct", insertText: "type ${1:Name} struct {\n    ${2:Field} ${3:string}\n}", detail: "Struct type" },
      { label: "interface", insertText: "type ${1:Name} interface {\n    ${2:Method}() ${3:error}\n}", detail: "Interface type" },
      { label: "switch", insertText: "switch ${1:expr} {\ncase ${2:val}:\n    ${3:// code}\ndefault:\n    ${4:// code}\n}", detail: "Switch" },
      { label: "goroutine", insertText: "go func() {\n    ${1:// body}\n}()", detail: "Goroutine" },
      { label: "defer", insertText: "defer ${1:func()}", detail: "Defer call" },
    ],
  },
  rust: {
    keywords: [
      "as", "async", "await", "break", "const", "continue", "crate",
      "dyn", "else", "enum", "extern", "false", "fn", "for", "if",
      "impl", "in", "let", "loop", "match", "mod", "move", "mut",
      "pub", "ref", "return", "self", "Self", "static", "struct",
      "super", "trait", "true", "type", "union", "unsafe", "use",
      "where", "while", "i8", "i16", "i32", "i64", "i128", "isize",
      "u8", "u16", "u32", "u64", "u128", "usize", "f32", "f64",
      "bool", "char", "str", "String", "Vec", "Option", "Result",
      "Box", "Rc", "Arc", "HashMap", "HashSet", "BTreeMap",
    ],
    builtins: [
      "println!", "print!", "eprintln!", "eprint!", "format!",
      "vec!", "panic!", "assert!", "assert_eq!", "assert_ne!",
      "dbg!", "todo!", "unimplemented!", "unreachable!",
      "unwrap", "expect", "is_some", "is_none", "is_ok", "is_err",
      "map", "filter", "collect", "iter", "into_iter", "enumerate",
      "zip", "fold", "any", "all", "find", "position",
      "push", "pop", "len", "is_empty", "contains", "insert",
      "remove", "get", "clone", "to_string", "as_str", "parse",
      "to_owned", "from", "into", "as_ref", "as_mut",
    ],
    snippets: [
      { label: "fn main", insertText: "fn main() {\n    ${1:println!(\"Hello\");}\n}", detail: "Main function" },
      { label: "fn", insertText: "fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n    ${4:// body}\n}", detail: "Function" },
      { label: "let", insertText: "let ${1:name}: ${2:Type} = ${3:value};", detail: "Let binding" },
      { label: "let-mut", insertText: "let mut ${1:name}: ${2:Type} = ${3:value};", detail: "Mutable binding" },
      { label: "struct", insertText: "struct ${1:Name} {\n    ${2:field}: ${3:Type},\n}", detail: "Struct" },
      { label: "impl", insertText: "impl ${1:Name} {\n    fn ${2:method}(&self) -> ${3:Type} {\n        ${4:// body}\n    }\n}", detail: "Impl block" },
      { label: "enum", insertText: "enum ${1:Name} {\n    ${2:Variant1},\n    ${3:Variant2},\n}", detail: "Enum" },
      { label: "match", insertText: "match ${1:expr} {\n    ${2:Pattern} => ${3:result},\n    _ => ${4:default},\n}", detail: "Match expression" },
      { label: "if-let", insertText: "if let ${1:Some(val)} = ${2:expr} {\n    ${3:// body}\n}", detail: "If let" },
      { label: "trait", insertText: "trait ${1:Name} {\n    fn ${2:method}(&self) -> ${3:Type};\n}", detail: "Trait" },
      { label: "for", insertText: "for ${1:item} in ${2:iter} {\n    ${3:// body}\n}", detail: "For loop" },
      { label: "loop", insertText: "loop {\n    ${1:// body}\n    break;\n}", detail: "Infinite loop" },
    ],
  },
  html: {
    keywords: [],
    builtins: [],
    snippets: [
      { label: "html5", insertText: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${1:Document}</title>\n</head>\n<body>\n    ${2:<!-- content -->}\n</body>\n</html>', detail: "HTML5 boilerplate" },
      { label: "div", insertText: '<div class="${1:class}">\n    ${2:content}\n</div>', detail: "Div element" },
      { label: "a", insertText: '<a href="${1:#}">${2:Link text}</a>', detail: "Anchor tag" },
      { label: "img", insertText: '<img src="${1:url}" alt="${2:description}" />', detail: "Image tag" },
      { label: "ul", insertText: "<ul>\n    <li>${1:item}</li>\n</ul>", detail: "Unordered list" },
      { label: "ol", insertText: "<ol>\n    <li>${1:item}</li>\n</ol>", detail: "Ordered list" },
      { label: "form", insertText: '<form action="${1:#}" method="${2:post}">\n    ${3:<!-- fields -->}\n    <button type="submit">${4:Submit}</button>\n</form>', detail: "Form element" },
      { label: "input", insertText: '<input type="${1:text}" name="${2:name}" placeholder="${3:}" />', detail: "Input field" },
      { label: "table", insertText: "<table>\n    <thead>\n        <tr>\n            <th>${1:Header}</th>\n        </tr>\n    </thead>\n    <tbody>\n        <tr>\n            <td>${2:Data}</td>\n        </tr>\n    </tbody>\n</table>", detail: "Table element" },
      { label: "link-css", insertText: '<link rel="stylesheet" href="${1:styles.css}" />', detail: "CSS link" },
      { label: "script", insertText: '<script src="${1:script.js}"></script>', detail: "Script tag" },
      { label: "section", insertText: '<section id="${1:section}">\n    ${2:content}\n</section>', detail: "Section element" },
    ],
  },
  css: {
    keywords: [
      "@media", "@keyframes", "@import", "@font-face", "@supports",
      "@layer", "@container", "@property", "!important",
      "inherit", "initial", "unset", "revert",
    ],
    builtins: [
      "display", "position", "width", "height", "margin", "padding",
      "border", "background", "color", "font-size", "font-weight",
      "font-family", "text-align", "text-decoration", "line-height",
      "letter-spacing", "flex", "flex-direction", "justify-content",
      "align-items", "align-self", "flex-wrap", "gap", "grid",
      "grid-template-columns", "grid-template-rows", "overflow",
      "z-index", "opacity", "visibility", "cursor", "transition",
      "transform", "animation", "box-shadow", "border-radius",
      "max-width", "min-width", "max-height", "min-height",
      "object-fit", "aspect-ratio", "backdrop-filter", "filter",
      "clip-path", "outline", "box-sizing", "pointer-events",
      "user-select", "scroll-behavior", "content", "white-space",
    ],
    snippets: [
      { label: "flexbox", insertText: "display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};", detail: "Flexbox layout" },
      { label: "grid", insertText: "display: grid;\ngrid-template-columns: ${1:repeat(3, 1fr)};\ngap: ${2:1rem};", detail: "CSS Grid layout" },
      { label: "media", insertText: "@media (max-width: ${1:768px}) {\n    ${2:/* styles */}\n}", detail: "Media query" },
      { label: "keyframes", insertText: "@keyframes ${1:name} {\n    from {\n        ${2:/* start */}\n    }\n    to {\n        ${3:/* end */}\n    }\n}", detail: "Keyframe animation" },
      { label: "transition", insertText: "transition: ${1:all} ${2:0.3s} ${3:ease};", detail: "Transition" },
      { label: "center", insertText: "display: flex;\njustify-content: center;\nalign-items: center;", detail: "Center content" },
      { label: "reset", insertText: "* {\n    margin: 0;\n    padding: 0;\n    box-sizing: border-box;\n}", detail: "CSS Reset" },
      { label: "var", insertText: "var(--${1:name})", detail: "CSS variable" },
      { label: "gradient", insertText: "background: linear-gradient(${1:135deg}, ${2:#667eea} 0%, ${3:#764ba2} 100%);", detail: "Linear gradient" },
      { label: "shadow", insertText: "box-shadow: ${1:0} ${2:4px} ${3:15px} ${4:rgba(0, 0, 0, 0.1)};", detail: "Box shadow" },
    ],
  },
};

const registeredLanguages = new Set();

function registerCompletionProviders(monaco) {
  Object.entries(LANGUAGE_COMPLETIONS).forEach(([langId, data]) => {
    if (registeredLanguages.has(langId)) return;
    registeredLanguages.add(langId);

    monaco.languages.registerCompletionItemProvider(langId, {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [];

        data.keywords.forEach((kw) => {
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range,
          });
        });

        data.builtins.forEach((fn) => {
          suggestions.push({
            label: fn,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: fn,
            range,
          });
        });

        data.snippets.forEach((snip) => {
          suggestions.push({
            label: snip.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: snip.insertText,
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: snip.detail,
            range,
          });
        });

        return { suggestions };
      },
    });
  });
}

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(getDefaultCode("javascript"));
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");

  const [remoteCursors, setRemoteCursors] = useState({});
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const cursorColorMapRef = useRef({});
  const nextColorRef = useRef(0);

  useEffect(() => {
    socket.on("userJoined", (users) => {
      setUsers(users);
    });

    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    });

    socket.on("userTyping", (user) => {
      setTyping(`${user.slice(0, 8)} is typing...`);
      setTimeout(() => setTyping(""), 2000);
    });

    socket.on("languageUpdate", (newLanguage) => {
      setLanguage(newLanguage);
    });

    socket.on("cursorUpdate", ({ socketId, userName: cursorUser, position }) => {
      setRemoteCursors((prev) => {
        if (!cursorColorMapRef.current[socketId]) {
          cursorColorMapRef.current[socketId] =
            nextColorRef.current % CURSOR_COLORS.length;
          nextColorRef.current++;
        }
        return {
          ...prev,
          [socketId]: {
            userName: cursorUser,
            position,
            colorIndex: cursorColorMapRef.current[socketId],
          },
        };
      });
    });

    socket.on("cursorRemove", ({ socketId }) => {
      setRemoteCursors((prev) => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });
      delete cursorColorMapRef.current[socketId];
    });

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("cursorUpdate");
      socket.off("cursorRemove");
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const newDecorations = Object.values(remoteCursors).map((cursor) => {
      const color = CURSOR_COLORS[cursor.colorIndex] || CURSOR_COLORS[0];
      return {
        range: new monaco.Range(
          cursor.position.lineNumber,
          cursor.position.column,
          cursor.position.lineNumber,
          cursor.position.column
        ),
        options: {
          className: `remote-cursor-decoration`,
          beforeContentClassName: `remote-cursor-widget`,
          before: {
            content: " ",
            inlineClassName: `remote-cursor-line`,
            inlineClassNameAffectsLetterSpacing: true,
          },
          after: {
            content: ` ${cursor.userName.slice(0, 10)}`,
            inlineClassName: `remote-cursor-label`,
            inlineClassNameAffectsLetterSpacing: true,
          },
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      };
    });

    let styleEl = document.getElementById("remote-cursor-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "remote-cursor-styles";
      document.head.appendChild(styleEl);
    }
    const colorCSS = Object.values(remoteCursors)
      .map((c) => {
        const color = CURSOR_COLORS[c.colorIndex] || CURSOR_COLORS[0];
        return "";
      })
      .join("");

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }, [remoteCursors]);

  const handleEditorMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      registerCompletionProviders(monaco);

      editor.onDidChangeCursorPosition((e) => {
        if (joined && roomId) {
          socket.emit("cursorChange", {
            roomId,
            userName,
            position: {
              lineNumber: e.position.lineNumber,
              column: e.position.column,
            },
          });
        }
      });
    },
    [joined, roomId, userName]
  );

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied!");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode(getDefaultCode("javascript"));
    setLanguage("javascript");
    setRemoteCursors({});
    cursorColorMapRef.current = {};
    nextColorRef.current = 0;
    decorationsRef.current = [];
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });

    if (ALL_DEFAULTS.has(code.trim())) {
      const newCode = getDefaultCode(newLanguage);
      setCode(newCode);
      socket.emit("codeChange", { roomId, code: newCode });
    }
  };

  const handleDownloadCode = () => {
    const ext = LANGUAGE_EXTENSIONS[language] || ".txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      joinRoom();
    }
  };

  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <h1>SyncForge</h1>
          <p className="form-subtitle">Real-time collaborative code editing</p>
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <span className="input-icon">⌗</span>
          </div>
          <div className="input-group">
            <input
              type="text"
              placeholder="Your Display Name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <span className="input-icon">◎</span>
          </div>
          <button onClick={joinRoom}>Join Room →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="sidebar">
        <div className="room-info">
          <div className="sidebar-brand">⟨⟩ SyncForge</div>
          <h2>Room</h2>
          <div className="room-id-display">{roomId}</div>
          <button onClick={copyRoomId} className="copy-btn">
            📋 Copy Room ID
          </button>
          {copySuccess && (
            <span className="copy-success">{copySuccess}</span>
          )}
        </div>

        <div className="users-section">
          <h3>Connected Users</h3>
          <ul>
            {users.map((user, index) => (
              <li key={index} style={{ animationDelay: `${index * 0.1}s` }}>
                {user.slice(0, 12)}
              </li>
            ))}
          </ul>
          {typing && <p className="typing-indicator">{typing}</p>}
        </div>

        <hr className="sidebar-divider" />

        <div className="controls-section">
          <h3>Language</h3>
          <select
            className="lang-selector"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="cpp">C++</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="csharp">C#</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
          </select>
        </div>

        <button className="download-btn" onClick={handleDownloadCode}>
          ⬇ Download Code
        </button>

        <button className="leave" onClick={leaveRoom}>
          ← Leave Room
        </button>
      </div>
      <div className="editor-wrapper">
        <Editor
          height="100%"
          defaultLanguage={language}
          language={language}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', Consolas, monospace",
            fontLigatures: true,
            padding: { top: 20 },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "all",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineHeight: 22,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            parameterHints: { enabled: true },
            wordBasedSuggestions: "currentDocument",
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showFunctions: true,
              showVariables: true,
              showClasses: true,
              showModules: true,
              showProperties: true,
              showMethods: true,
              preview: true,
            },
            acceptSuggestionOnCommitCharacter: true,
            tabCompletion: "on",
          }}
        />
      </div>
    </div>
  );
};

export default App;