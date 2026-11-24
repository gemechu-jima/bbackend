// src/utils/afroSms.js
function formatEthiopianPhone(phone) {
  const cleaned = String(phone).trim().replace(/\s+/g, '');
  if (cleaned.startsWith('09') || cleaned.startsWith('07')) {
    return `+251${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('251')) {
    return `+${cleaned}`;
  }
  return cleaned;
}

async function sendAfroSMS(to, message) {
  if (!process.env.AFROMESSAGE_TOKEN) {
    throw new Error('AFROMESSAGE_TOKEN is not configured on the server.');
  }

  const payload = {
    to: formatEthiopianPhone(to),
    message,
  };

  // Optional: set AFROMESSAGE_IDENTIFIER_ID / AFROMESSAGE_SENDER_NAME in Render when approved
  if (process.env.AFROMESSAGE_IDENTIFIER_ID) {
    payload.from = process.env.AFROMESSAGE_IDENTIFIER_ID;
  }
  // if (process.env.AFROMESSAGE_SENDER_NAME) {
  //   payload.sender = process.env.AFROMESSAGE_SENDER_NAME;
  // }

  const response = await fetch('https://api.afromessage.com/api/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AFROMESSAGE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.acknowledge !== 'success') {
    throw new Error(data?.response?.errors?.[0] || 'Failed to send SMS via AfroMessage.');
  }

  return data;
}

module.exports = { sendAfroSMS, formatEthiopianPhone };