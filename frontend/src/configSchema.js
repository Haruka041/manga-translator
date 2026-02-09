export const defaultConfig = {
  openai_base_url: '',
  model_a: 'gemini-3-pro-preview',
  model_b: 'gemini-3-pro-image-preview',
  model_a_protocol: 'chat_completions',
  model_b_protocol: 'images_edits',
  model_b_endpoint: '/v1/images/edits',
  model_a_use_schema: true,
  qa_mode: 'auto',
  reading_direction: 'auto',
  output_format: 'cbz',
  stage_a_timeout: 120,
  stage_b_timeout: 300,
  retries: 1,
  stage_a_concurrency: 6,
  stage_b_concurrency: 4,
  keep_all_artifacts: true
}

export const configFields = [
  { key: 'openai_base_url', label: 'OpenAI Base URL' },
  { key: 'model_a', label: 'Model A' },
  { key: 'model_b', label: 'Model B' },
  { key: 'model_a_protocol', label: 'Model A Protocol', type: 'select', options: ['chat_completions', 'responses'] },
  { key: 'model_b_protocol', label: 'Model B Protocol', type: 'select', options: ['images_edits', 'responses'] },
  { key: 'model_b_endpoint', label: 'Model B Endpoint' },
  { key: 'model_a_use_schema', label: 'Use JSON Schema', type: 'checkbox' },
  { key: 'qa_mode', label: 'QA Mode', type: 'select', options: ['auto', 'strict'] },
  { key: 'reading_direction', label: 'Reading Direction', type: 'select', options: ['auto', 'rtl', 'ltr'] },
  { key: 'output_format', label: 'Output Format', type: 'select', options: ['cbz', 'zip'] },
  { key: 'stage_a_timeout', label: 'Stage A Timeout (s)', type: 'number' },
  { key: 'stage_b_timeout', label: 'Stage B Timeout (s)', type: 'number' },
  { key: 'retries', label: 'Retries', type: 'number' },
  { key: 'stage_a_concurrency', label: 'Stage A Concurrency', type: 'number', hint: '需重启服务生效' },
  { key: 'stage_b_concurrency', label: 'Stage B Concurrency', type: 'number', hint: '需重启服务生效' },
  { key: 'keep_all_artifacts', label: 'Keep All Artifacts', type: 'checkbox' }
]
