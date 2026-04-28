const http = require('http');
const https = require('https');

const PORT = 18792;
const OPENAI_HOST = 'api.openai.com';
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error('[PROXY] ERROR: OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

// AICare tools in OpenAI format
const AICARE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'mcp_aicare_get_patient_by_phone',
      description: 'Look up a patient by their WhatsApp phone number',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'WhatsApp phone number, e.g. 628123456789' }
        },
        required: ['phone']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mcp_aicare_record_medication_response',
      description: 'Record a patient response to the medication reminder',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string' },
          answer: { type: 'string', enum: ['YES', 'NO', 'UNCLEAR'] },
          raw_message: { type: 'string' }
        },
        required: ['phone', 'answer', 'raw_message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mcp_aicare_record_activity_report',
      description: 'Record a patient self-reported physical activity count for today',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Patient WhatsApp phone number' },
          activity_count: { type: 'integer', minimum: 0, maximum: 10, description: 'Number of activity sessions today' },
          raw_message: { type: 'string', description: 'Original message from patient' }
        },
        required: ['phone', 'activity_count']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mcp_aicare_record_diet_report',
      description: 'Record a patient self-reported healthy eating status for today',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Patient WhatsApp phone number' },
          ate_healthy: { type: 'boolean', description: 'True if patient ate healthy food today' },
          raw_message: { type: 'string', description: 'Original message from patient' }
        },
        required: ['phone', 'ate_healthy']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mcp_aicare_get_today_reports',
      description: 'Get all self-reports for a patient today (activity, diet, medication)',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Patient WhatsApp phone number' }
        },
        required: ['phone']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mcp_aicare_get_non_responders',
      description: 'Get patients who received a reminder today but have not responded yet',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mcp_aicare_record_guardian_notified',
      description: 'Record that a guardian has been notified',
      parameters: {
        type: 'object',
        properties: {
          patient_id: { type: 'integer' }
        },
        required: ['patient_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mcp_aicare_record_reminder_sent',
      description: 'Mark that a medication reminder has been sent to a patient today',
      parameters: {
        type: 'object',
        properties: {
          patient_id: { type: 'integer' }
        },
        required: ['patient_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mcp_aicare_get_patients_for_reminder',
      description: 'Get all active patients who have not yet received a reminder today',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mcp_aicare_get_all_patients_for_broadcast',
      description: 'Get all active patients to send a broadcast message',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mcp_aicare_record_broadcast_sent',
      description: 'Record a broadcast message that was sent to patients',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          message: { type: 'string' },
          recipient_count: { type: 'integer' }
        },
        required: ['message', 'recipient_count']
      }
    }
  }
];

const server = http.createServer((req, res) => {
  const clientIp = req.socket.remoteAddress;
  const timestamp = new Date().toISOString();

  // Log incoming request
  console.log(`[PROXY] ${timestamp} ${req.method} ${req.url} from ${clientIp}`);

  if (req.url !== '/v1/chat/completions') {
    // Pass through other endpoints
    const options = {
      hostname: OPENAI_HOST,
      port: 443,
      path: req.url,
      method: req.method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    };
    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
      console.error('[PROXY] Pass-through error:', err.message);
      res.writeHead(502);
      res.end(JSON.stringify({ error: err.message }));
    });
    req.pipe(proxyReq);
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const json = JSON.parse(body);
      const hasOriginalTools = !!(json.tools && json.tools.length > 0);
      console.log(`[PROXY] ${timestamp} model=${json.model} messages=${json.messages?.length} original_tools=${hasOriginalTools}`);

      // Inject tools if not present
      if (!hasOriginalTools) {
        json.tools = AICARE_TOOLS;
        json.tool_choice = 'auto';
        console.log(`[PROXY] ${timestamp} Injected ${AICARE_TOOLS.length} tools`);
      } else {
        console.log(`[PROXY] ${timestamp} Using original tools (${json.tools.length})`);
      }

      const postData = JSON.stringify(json);
      const options = {
        hostname: OPENAI_HOST,
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const proxyReq = https.request(options, (proxyRes) => {
        let responseBody = '';
        proxyRes.on('data', chunk => responseBody += chunk);
        proxyRes.on('end', () => {
          try {
            const respJson = JSON.parse(responseBody);
            const toolCalls = respJson.choices?.[0]?.message?.tool_calls;
            const finishReason = respJson.choices?.[0]?.finish_reason;
            console.log(`[PROXY] ${timestamp} Response: status=${proxyRes.statusCode} finish_reason=${finishReason} tool_calls=${!!toolCalls}`);
            if (toolCalls) {
              console.log(`[PROXY] ${timestamp} Tool calls: ${JSON.stringify(toolCalls.map(t => t.function?.name || t.function))}`);
            }
          } catch (e) {
            console.log(`[PROXY] ${timestamp} Response: status=${proxyRes.statusCode} (non-JSON)`);
          }
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          res.end(responseBody);
        });
      });

      proxyReq.on('error', (err) => {
        console.error(`[PROXY] ${timestamp} Forward error:`, err.message);
        res.writeHead(502);
        res.end(JSON.stringify({ error: err.message }));
      });

      proxyReq.write(postData);
      proxyReq.end();
    } catch (e) {
      console.error(`[PROXY] ${timestamp} Parse error:`, e.message);
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`OpenAI proxy listening on http://127.0.0.1:${PORT}`);
  console.log(`Press Ctrl+C to stop`);
});
