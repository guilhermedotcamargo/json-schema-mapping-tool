import { useState, type JSX } from 'react'
import './App.css'

interface MappingResult {
  sourceKey: string
  targetKey: string
  confidence: number
}

const generateMapperScript = (items: MappingResult[]): string => {
  const usableMappings = items.filter(
    (mapping) =>
      mapping.sourceKey.trim().length > 0 &&
      mapping.targetKey.trim().length > 0
  )

  const mappingLines =
    usableMappings.length > 0
      ? usableMappings.map((mapping) => {
          const sourcePath = JSON.stringify(mapping.sourceKey)
          const targetPath = JSON.stringify(mapping.targetKey)
          return `  setValue(target, ${targetPath}, getValue(source, ${sourcePath}))`
        })
      : ['  // No valid mappings available.']

  return [
    'export const mapSourceToTarget = (source: any): Record<string, unknown> => {',
    '  const target: Record<string, unknown> = {}',
    '',
    '  const getValue = (input: any, path: string): unknown => {',
    '    return path.split(".").reduce((acc, key) => {',
    '      if (acc && typeof acc === "object") {',
    '        return (acc as Record<string, unknown>)[key]',
    '      }',
    '      return undefined',
    '    }, input)',
    '  }',
    '',
    '  const setValue = (output: Record<string, unknown>, path: string, value: unknown): void => {',
    '    const keys = path.split(".")',
    '    let cursor: Record<string, unknown> = output',
    '',
    '    keys.forEach((key, index) => {',
    '      if (index === keys.length - 1) {',
    '        cursor[key] = value',
    '        return',
    '      }',
    '',
    '      const next = cursor[key]',
    '      if (!next || typeof next !== "object") {',
    '        cursor[key] = {}',
    '      }',
    '      cursor = cursor[key] as Record<string, unknown>',
    '    })',
    '  }',
    '',
    ...mappingLines,
    '',
    '  return target',
    '}',
  ].join('\n')
}

function App(): JSX.Element {
  const [sourceJSON, setSourceJSON] = useState<string>('')
  const [targetJSON, setTargetJSON] = useState<string>('')
  const [mappings, setMappings] = useState<MappingResult[]>([])
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isMapping, setIsMapping] = useState<boolean>(false)
  const [copyMessage, setCopyMessage] = useState<string>('')
  const [mappedResult, setMappedResult] = useState<Record<string, unknown> | null>(null)

  const mapperScript = generateMapperScript(mappings)

  const handleMap = async (): Promise<void> => {
    setErrorMessage('')

    let parsedSource: unknown
    let parsedTarget: unknown

    try {
      parsedSource = JSON.parse(sourceJSON)
      parsedTarget = JSON.parse(targetJSON)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Invalid JSON provided.'
      setErrorMessage(`Invalid JSON: ${message}`)
      return
    }

    setIsMapping(true)

    try {
      const response = await fetch('http://localhost:3000/map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: parsedSource, target: parsedTarget }),
      })

      if (!response.ok) {
        throw new Error('Mapping request failed.')
      }

      const result = (await response.json()) as MappingResult[]
      setMappings(result)

      // Execute the generated mapper on the source data
      try {
        const getValue = (input: any, path: string): unknown => {
          return path.split('.').reduce((acc, key) => {
            if (acc && typeof acc === 'object') {
              return (acc as Record<string, unknown>)[key]
            }
            return undefined
          }, input)
        }

        const setValue = (output: Record<string, unknown>, path: string, value: unknown): void => {
          const keys = path.split('.')
          let cursor: Record<string, unknown> = output

          keys.forEach((key, index) => {
            if (index === keys.length - 1) {
              cursor[key] = value
              return
            }

            const next = cursor[key]
            if (!next || typeof next !== 'object') {
              cursor[key] = {}
            }
            cursor = cursor[key] as Record<string, unknown>
          })
        }

        const target: Record<string, unknown> = {}
        result.forEach((mapping) => {
          const value = getValue(parsedSource, mapping.sourceKey)
          setValue(target, mapping.targetKey, value)
        })
        setMappedResult(target)
      } catch (error) {
        console.error('Failed to execute mapper:', error)
        setMappedResult(null)
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to map schemas.'
      setErrorMessage(message)
    } finally {
      setIsMapping(false)
    }
  }

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(mapperScript)
      setCopyMessage('Copied!')
    } catch (error) {
      setCopyMessage('Copy failed.')
    } finally {
      window.setTimeout(() => setCopyMessage(''), 2000)
    }
  }

  const handleLoadExample = (): void => {
    const exampleSource = {
      firstName: 'John',
      lastName: 'Doe',
      emailAddress: 'john.doe@example.com',
      phoneNumber: '555-1234',
      address: {
        street: '123 Main St',
        city: 'Springfield',
        zipCode: '12345',
      },
    }

    const exampleTarget = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      location: {
        street_address: '',
        city_name: '',
        postal_code: '',
      },
    }

    setSourceJSON(JSON.stringify(exampleSource, null, 2))
    setTargetJSON(JSON.stringify(exampleTarget, null, 2))
  }

  const handleReset = (): void => {
    setSourceJSON('')
    setTargetJSON('')
    setMappings([])
    setErrorMessage('')
    setMappedResult(null)
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-700/50 px-8 py-5 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-sm text-slate-400 mt-1">
              JSON Schema Mapping Tool
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {mappings.length > 0 && (
              <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition"
              title="Home"
              >
              🏠 Home
              </button>
            )}
            <button
              type="button"
              onClick={handleLoadExample}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition"
            >
              ⭐ Example
            </button>
            <button
              type="button"
              onClick={handleMap}
              disabled={isMapping}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✨ {isMapping ? 'Mapping...' : 'Map'}
            </button>
          </div>
        </div>
        {errorMessage.length > 0 && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-start gap-3">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Main Content - Editor Section */}
      <div className="flex-1 flex flex-col gap-0 overflow-hidden">
        <div className="flex flex-row flex-1 gap-6 p-8 overflow-hidden">
          {/* Source Editor */}
          <div className="w-1/2 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📥</span>
              <label className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                Source Schema
              </label>
            </div>
            <textarea
              value={sourceJSON}
              onChange={(e) => setSourceJSON(e.target.value)}
              placeholder="Paste your source JSON schema..."
              className="flex-1 bg-slate-950/80 border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-100 resize-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 placeholder-slate-600"
            />
          </div>

          {/* Arrow Divider */}
          <div className="flex items-center justify-center py-8">
            <div className="text-2xl text-slate-600 animate-pulse">→</div>
          </div>

          {/* Target Editor */}
          <div className="w-1/2 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📤</span>
              <label className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                Target Schema
              </label>
            </div>
            <textarea
              value={targetJSON}
              onChange={(e) => setTargetJSON(e.target.value)}
              placeholder="Paste your target JSON schema..."
              className="flex-1 bg-slate-950/80 border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-100 resize-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 placeholder-slate-600"
            />
          </div>
        </div>

        {/* Results Section */}
        {mappings.length > 0 && (
            <div className="border-t border-slate-700/50 bg-slate-900/30 flex flex-col overflow-hidden">
            {/* Mappings Panel */}
            <div className="border-b border-slate-700/50 px-8 py-4 bg-slate-900/40">
              <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🔗</span>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Field Mappings</h2>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-700/50">
              <table className="w-full text-sm border-collapse">
              <thead>
              <tr className="bg-slate-900/60 border-b border-slate-700/50">
              <th className="border border-slate-700/50 px-4 py-3 text-left font-semibold text-slate-300">Source Field</th>
              <th className="border border-slate-700/50 px-4 py-3 text-left font-semibold text-slate-300">Target Field</th>
              <th className="border border-slate-700/50 px-4 py-3 text-left font-semibold text-slate-300">Confidence</th>
              </tr>
              </thead>
              <tbody>
              {mappings.map((mapping, index) => (
              <tr
              key={index}
              className={`transition ${
                index % 2 === 0 ? 'bg-slate-900/20' : 'bg-slate-900/40'
              } hover:bg-slate-800/60 hover:shadow-lg hover:shadow-cyan-500/20`}
              >
              <td className="border border-slate-700/30 px-4 py-3 text-slate-400 font-mono">{mapping.sourceKey}</td>
              <td className="border border-slate-700/30 px-4 py-3 text-slate-400 font-mono">{mapping.targetKey}</td>
              <td className="border border-slate-700/30 px-4 py-3">
              <span className="inline-block rounded px-2 py-1 text-xs font-semibold text-emerald-200 bg-emerald-500/20">
              {(mapping.confidence * 100).toFixed(0)}%
              </span>
              </td>
              </tr>
              ))}
              </tbody>
              </table>
              </div>
            </div>

            {/* Generated Code and Result */}
            <div className="flex-1 flex flex-col gap-4 p-8 overflow-y-auto">
              <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Generated Mapper</h3>
              </div>
              <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
              >
              {copyMessage.length > 0 ? (
              <>
              <span>✅</span>
              <span>{copyMessage}</span>
              </>
              ) : (
              <>
              <span>📋</span>
              <span>Copy</span>
              </>
              )}
              </button>
              </div>
              <pre className="flex-1 overflow-auto rounded-lg border border-slate-700/50 bg-slate-950/80 p-4 text-xs text-emerald-300 font-mono">
              <code>{mapperScript}</code>
              </pre>
              </div>

              {mappedResult && (
              <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Mapping Result</h3>
              </div>
              <pre className="flex-1 overflow-auto rounded-lg border border-slate-700/50 bg-slate-950/80 p-4 text-xs text-blue-300 font-mono">
              <code>{JSON.stringify(mappedResult, null, 2)}</code>
              </pre>
              </div>
              )}
            </div>
            </div>
        )}
      </div>
    </div>
  )
}

export default App
