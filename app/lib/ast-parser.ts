// app/lib/ast-parser.ts

export interface CodeChunk {
  filePath: string;
  lines: string;
  blockName: string;
  code: string;
}

export function parseCodeIntoSemanticChunks(code: string, filePath: string): CodeChunk[] {
  const extension = filePath.split(".").pop()?.toLowerCase() || "";
  const lines = code.split("\n");
  const chunks: CodeChunk[] = [];

  let currentChunk: string[] = [];
  let startLine = 1;
  let currentBlockName = "global_scope";

  /**
   * UNIVERSAL BOUNDARY DETECTOR
   * Handles:
   * - JS/TS: export, function, class, const/let arrow fns
   * - Rust: pub, fn, impl, struct, enum, trait
   * - Python: def, class
   * - Go: func, type, struct
   * - Java/C/C++: public, private, static, class, void, int, struct
   * - OCaml: let, module, type
   */
  const universalRegex = new RegExp(
    [
      /^(?:export\s+|pub(?:\(.*\))?\s+|public\s+|private\s+|protected\s+)?/, // Visibility
      /(?:async\s+|static\s+|inline\s+)?/, // Modifiers
      /(?:function|class|fn|def|func|struct|impl|enum|trait|module|type|void|int|interface|let|var|const)\s+/, // Keywords
      /([a-zA-Z0-9_]+)/, // Name Capture
    ]
      .map((r) => r.source)
      .join(""),
    "m", // Multiline flag to allow ^ to match start of lines
  );

  /**
   * DOCUMENTATION BOUNDARY (MD, TXT, JSON)
   */
  const docRegex = /^(#{1,6}\s+|"[\w-]+":\s*\{|\[|\{)/;

  const isDoc = ["md", "txt", "json", "yaml", "yml"].includes(extension);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isBoundary = isDoc ? docRegex.test(line) : universalRegex.test(line);

    // If we hit a boundary AND we already have a chunk going, save the old one
    if (isBoundary && currentChunk.length > 0 && i > 0) {
      chunks.push({
        filePath,
        lines: `${startLine}-${i}`,
        blockName: currentBlockName,
        code: currentChunk.join("\n").trim(),
      });

      // Reset for new block
      currentChunk = [];
      startLine = i + 1;

      // Extract the name
      const nameMatch = line.match(isDoc ? /^(#{1,6}\s+)(.*)/ : universalRegex);
      if (nameMatch) {
        // nameMatch[1] for doc headers, nameMatch[1] for code keywords
        currentBlockName = (isDoc ? nameMatch[2] : nameMatch[1]) || `block_L${startLine}`;
      } else {
        currentBlockName = `anonymous_L${startLine}`;
      }
    }

    currentChunk.push(line);
  }

  // Push the final remaining chunk
  if (currentChunk.length > 0) {
    chunks.push({
      filePath,
      lines: `${startLine}-${lines.length}`,
      blockName: currentBlockName,
      code: currentChunk.join("\n").trim(),
    });
  }

  // Filter out tiny chunks (like single brackets or empty lines)
  return chunks.filter((c) => c.code.length > 20);
}
