interface Hint {
  pattern: RegExp;
  problem: string;
  suggestion: string;
  fix_command?: string;
}

const HINTS: Hint[] = [
  {
    pattern: /EADDRINUSE.*:(\d+)/,
    problem: "port already in use",
    suggestion: "run `lsof -i :{port}` to find and kill the process using it",
  },
  {
    pattern: /MODULE_NOT_FOUND|Cannot find module/i,
    problem: "missing dependency",
    suggestion: "try running `npm install` or `pip install -r requirements.txt`",
    fix_command: "npm install",
  },
  {
    pattern: /ENOENT.*no such file or directory/i,
    problem: "file or directory not found",
    suggestion: "check that the service path exists and the run command is correct",
  },
  {
    pattern: /Permission denied/i,
    problem: "permission denied",
    suggestion: "check file permissions or try running with appropriate privileges",
  },
  {
    pattern: /no such table|relation .* does not exist|OperationalError.*table/i,
    problem: "database table missing",
    suggestion: "try running database migrations (e.g. `python manage.py migrate` or `npx prisma migrate dev`)",
  },
  {
    pattern: /SyntaxError|IndentationError|TabError/,
    problem: "syntax error in source code",
    suggestion: "check the error output above for the file and line number",
  },
  {
    pattern: /ImportError|ModuleNotFoundError/,
    problem: "missing Python module",
    suggestion: "try `pip install -r requirements.txt` or activate your virtual environment",
    fix_command: "pip install -r requirements.txt",
  },
  {
    pattern: /ECONNREFUSED/,
    problem: "connection refused",
    suggestion: "a dependency service may not be running — check depends_on in rift.yml",
  },
  {
    pattern: /ERR_DLOPEN_FAILED|dylib|\.so.*not found/i,
    problem: "native module error",
    suggestion: "try deleting node_modules and running `npm install` again",
    fix_command: "rm -rf node_modules && npm install",
  },
  {
    pattern: /OutOfMemoryError|FATAL ERROR: .* JavaScript heap/i,
    problem: "out of memory",
    suggestion: "try increasing memory with NODE_OPTIONS=--max-old-space-size=4096",
  },
];

export interface HintResult {
  service: string;
  problem: string;
  suggestion: string;
  fix_command?: string;
  lastOutput: string;
}

export function matchHints(service: string, logContent: string): HintResult | null {
  for (const hint of HINTS) {
    const match = logContent.match(hint.pattern);
    if (match) {
      let suggestion = hint.suggestion;
      // Replace {port} placeholder if port was captured
      if (match[1]) {
        suggestion = suggestion.replace("{port}", match[1]);
      }

      // Extract last few meaningful lines for context
      const lines = logContent.trim().split("\n");
      const lastLines = lines.slice(-5).join("\n");

      return {
        service,
        problem: hint.problem,
        suggestion,
        fix_command: hint.fix_command,
        lastOutput: lastLines,
      };
    }
  }

  return null;
}

export function getGenericHint(service: string, logContent: string): HintResult {
  const lines = logContent.trim().split("\n");
  const lastLines = lines.slice(-5).join("\n");

  return {
    service,
    problem: "unknown error",
    suggestion: "set ANTHROPIC_API_KEY for AI-powered diagnosis",
    lastOutput: lastLines,
  };
}
