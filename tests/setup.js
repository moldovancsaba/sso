// Mock window object for browser-like environment
global.window = {\n  location: {\n    href: 'http://example.com',\n  },\n};\n\n// Mock fetch API\nglobal.fetch = () => Promise.reject(new Error('fetch is not implemented'));\n
