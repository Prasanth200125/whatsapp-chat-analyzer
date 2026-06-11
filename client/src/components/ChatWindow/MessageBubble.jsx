/**
 * MessageBubble — Renders a single message in the chat
 * 
 * Supports text and table response types with markdown-like formatting.
 */

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isError = message.isError;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Basic markdown-like rendering:
   * **bold**, `code`, tables (|---|), bullet points
   */
  const renderContent = (text) => {
    if (!text) return null;

    // Split by lines
    const lines = text.split('\n');
    const elements = [];
    let inTable = false;
    let tableHeaders = [];
    let tableRows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect table rows
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        // Skip separator rows (|---|---|)
        if (/^\|[\s\-:]+\|/.test(line.trim()) && line.includes('---')) {
          continue;
        }

        const cells = line.split('|').filter((c) => c.trim() !== '');

        if (!inTable) {
          inTable = true;
          tableHeaders = cells.map((c) => c.trim());
        } else {
          tableRows.push(cells.map((c) => c.trim()));
        }
        continue;
      }

      // If we were in a table, flush it
      if (inTable) {
        elements.push(renderTable(tableHeaders, tableRows, elements.length));
        inTable = false;
        tableHeaders = [];
        tableRows = [];
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<br key={`br-${i}`} />);
        continue;
      }

      // Headers (## or **)
      if (line.startsWith('## ') || line.startsWith('### ')) {
        elements.push(
          <strong key={`h-${i}`} style={{ display: 'block', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
            {line.replace(/^#+\s/, '')}
          </strong>
        );
        continue;
      }

      // Render line with inline formatting
      elements.push(
        <span key={`l-${i}`} style={{ display: 'block' }}>
          {renderInline(line)}
        </span>
      );
    }

    // Flush any remaining table
    if (inTable) {
      elements.push(renderTable(tableHeaders, tableRows, elements.length));
    }

    return elements;
  };

  const renderInline = (text) => {
    // Handle **bold**, *italic*, `code`
    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold **text**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Code `text`
      const codeMatch = remaining.match(/`(.+?)`/);

      const matches = [boldMatch, codeMatch].filter(Boolean);
      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      // Pick the earliest match
      const earliest = matches.reduce((a, b) => (a.index < b.index ? a : b));

      if (earliest.index > 0) {
        parts.push(remaining.substring(0, earliest.index));
      }

      if (earliest === boldMatch) {
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      } else if (earliest === codeMatch) {
        parts.push(<code key={key++}>{codeMatch[1]}</code>);
      }

      remaining = remaining.substring(earliest.index + earliest[0].length);
    }

    return parts;
  };

  const renderTable = (headers, rows, key) => (
    <div key={`table-${key}`} style={{ overflowX: 'auto', margin: '0.5rem 0' }}>
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'} ${isError ? 'message-error' : ''}`}>
      <div className="message-avatar">
        {isUser ? '👤' : '🤖'}
      </div>
      <div>
        <div className="message-content">
          {renderContent(message.content)}
        </div>
        <div className="message-time">
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}
