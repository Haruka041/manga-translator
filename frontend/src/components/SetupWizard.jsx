import { useState } from 'react'

export default function SetupWizard({
  open,
  globalDraft,
  setGlobalDraft,
  globalKey,
  setGlobalKey,
  apiKeySet,
  onSave
}) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  if (!open || !globalDraft) return null

  const steps = ['连接中转 API', '模型选择', '运行偏好']
  const canNext =
    (step === 0 &&
      globalDraft.openai_base_url &&
      (globalKey || apiKeySet)) ||
    (step === 1 && globalDraft.model_a && globalDraft.model_b) ||
    step === 2

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="wizard-backdrop">
      <div className="wizard">
        <div className="wizard-title">首次启动设置指引</div>
        <div className="wizard-steps">
          {steps.map((label, idx) => (
            <div key={label} className={idx === step ? 'wizard-step active' : 'wizard-step'}>
              {idx + 1}. {label}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="wizard-body">
            <div className="field">
              <label>OpenAI Base URL（兼容中转）</label>
              <input
                value={globalDraft.openai_base_url || ''}
                onChange={(e) =>
                  setGlobalDraft({ ...globalDraft, openai_base_url: e.target.value })
                }
                placeholder="https://your-openai-compatible-endpoint"
              />
              <div className="hint">不要重复填写 /v1</div>
            </div>
            <div className="field">
              <label>API Key</label>
              <input
                value={globalKey}
                onChange={(e) => setGlobalKey(e.target.value)}
                placeholder="sk-..."
              />
              <div className="hint">API Key 只保存加密后的版本</div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="wizard-body">
            <div className="field">
              <label>模型 A（识别 / 翻译 / JSON）</label>
              <input
                value={globalDraft.model_a || ''}
                onChange={(e) => setGlobalDraft({ ...globalDraft, model_a: e.target.value })}
                placeholder="gemini-3-pro-preview"
              />
            </div>
            <div className="field">
              <label>模型 B（去字 / 嵌字）</label>
              <input
                value={globalDraft.model_b || ''}
                onChange={(e) => setGlobalDraft({ ...globalDraft, model_b: e.target.value })}
                placeholder="gemini-3-pro-image-preview"
              />
            </div>
            <div className="grid">
              <div className="field">
                <label>模型 A 协议</label>
                <select
                  value={globalDraft.model_a_protocol}
                  onChange={(e) =>
                    setGlobalDraft({ ...globalDraft, model_a_protocol: e.target.value })
                  }
                >
                  <option value="chat_completions">chat_completions</option>
                  <option value="responses">responses</option>
                </select>
              </div>
              <div className="field">
                <label>模型 B 协议</label>
                <select
                  value={globalDraft.model_b_protocol}
                  onChange={(e) =>
                    setGlobalDraft({ ...globalDraft, model_b_protocol: e.target.value })
                  }
                >
                  <option value="images_edits">images_edits</option>
                  <option value="responses">responses</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>模型 B Endpoint（images_edits）</label>
              <input
                value={globalDraft.model_b_endpoint || ''}
                onChange={(e) =>
                  setGlobalDraft({ ...globalDraft, model_b_endpoint: e.target.value })
                }
                placeholder="/v1/images/edits"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-body">
            <div className="grid">
              <div className="field">
                <label>QA 模式</label>
                <select
                  value={globalDraft.qa_mode}
                  onChange={(e) => setGlobalDraft({ ...globalDraft, qa_mode: e.target.value })}
                >
                  <option value="auto">auto</option>
                  <option value="strict">strict</option>
                </select>
              </div>
              <div className="field">
                <label>阅读方向</label>
                <select
                  value={globalDraft.reading_direction}
                  onChange={(e) =>
                    setGlobalDraft({ ...globalDraft, reading_direction: e.target.value })
                  }
                >
                  <option value="auto">auto</option>
                  <option value="rtl">rtl</option>
                  <option value="ltr">ltr</option>
                </select>
              </div>
              <div className="field">
                <label>输出格式</label>
                <select
                  value={globalDraft.output_format}
                  onChange={(e) =>
                    setGlobalDraft({ ...globalDraft, output_format: e.target.value })
                  }
                >
                  <option value="cbz">cbz</option>
                  <option value="zip">zip</option>
                </select>
              </div>
            </div>
            <div className="hint">高级参数可在全局设置中继续调整</div>
          </div>
        )}

        <div className="wizard-actions">
          <button disabled={step === 0 || saving} onClick={() => setStep(step - 1)}>
            上一步
          </button>
          {step < steps.length - 1 && (
            <button disabled={!canNext || saving} onClick={() => setStep(step + 1)}>
              下一步
            </button>
          )}
          {step === steps.length - 1 && (
            <button disabled={!canNext || saving} onClick={handleSave}>
              保存并开始使用
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
