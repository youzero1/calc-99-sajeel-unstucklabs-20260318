'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';

interface HistoryItem {
  id: number;
  expression: string;
  result: string;
  createdAt: string;
}

function evaluate(expr: string): string {
  try {
    // Replace display symbols with JS operators
    let sanitized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');

    // Safety check: only allow numbers and operators
    if (!/^[0-9+\-*/.%()\s]+$/.test(sanitized)) {
      return 'Error';
    }

    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + sanitized + ')')();

    if (!isFinite(result)) return 'Error';
    if (isNaN(result)) return 'Error';

    // Format result nicely
    const num = parseFloat(result.toPrecision(12));
    return String(num);
  } catch {
    return 'Error';
  }
}

export default function CalculatorPage() {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory, fetchHistory]);

  const saveCalculation = useCallback(async (expr: string, result: string) => {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: expr, result }),
      });
    } catch (err) {
      console.error('Failed to save calculation', err);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history', err);
    }
  }, []);

  const handleButton = useCallback(
    (value: string) => {
      switch (value) {
        case 'C': {
          setDisplay('0');
          setExpression('');
          setJustEvaluated(false);
          break;
        }
        case '⌫': {
          if (justEvaluated) {
            setDisplay('0');
            setExpression('');
            setJustEvaluated(false);
          } else {
            const newDisplay = display.length > 1 ? display.slice(0, -1) : '0';
            setDisplay(newDisplay);
          }
          break;
        }
        case '=': {
          const fullExpr = expression + display;
          const result = evaluate(fullExpr);
          saveCalculation(fullExpr, result);
          if (showHistory) fetchHistory();
          setDisplay(result);
          setExpression('');
          setJustEvaluated(true);
          break;
        }
        case '+/−': {
          if (display !== '0' && display !== 'Error') {
            if (display.startsWith('-')) {
              setDisplay(display.slice(1));
            } else {
              setDisplay('-' + display);
            }
          }
          break;
        }
        case '%': {
          if (display !== 'Error') {
            const val = parseFloat(display) / 100;
            setDisplay(String(val));
            setJustEvaluated(true);
          }
          break;
        }
        case '+': case '−': case '×': case '÷': {
          if (display === 'Error') break;
          if (justEvaluated) {
            setExpression(display + value);
            setDisplay('0');
            setJustEvaluated(false);
          } else {
            setExpression(expression + display + value);
            setDisplay('0');
          }
          break;
        }
        case '.': {
          if (justEvaluated) {
            setDisplay('0.');
            setExpression('');
            setJustEvaluated(false);
          } else if (!display.includes('.')) {
            setDisplay(display + '.');
          }
          break;
        }
        default: {
          // Digit
          if (display === 'Error') {
            setDisplay(value);
            setExpression('');
            setJustEvaluated(false);
          } else if (justEvaluated) {
            setDisplay(value);
            setExpression('');
            setJustEvaluated(false);
          } else {
            setDisplay(display === '0' ? value : display + value);
          }
          break;
        }
      }
    },
    [display, expression, justEvaluated, saveCalculation, showHistory, fetchHistory]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (key >= '0' && key <= '9') handleButton(key);
      else if (key === '+') handleButton('+');
      else if (key === '-') handleButton('−');
      else if (key === '*') handleButton('×');
      else if (key === '/') { e.preventDefault(); handleButton('÷'); }
      else if (key === '.') handleButton('.');
      else if (key === 'Enter' || key === '=') handleButton('=');
      else if (key === 'Backspace') handleButton('⌫');
      else if (key === 'Escape') handleButton('C');
      else if (key === '%') handleButton('%');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleButton]);

  const buttons = [
    ['C', '+/−', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '−'],
    ['1', '2', '3', '+'],
    ['⌫', '0', '.', '='],
  ];

  const getButtonClass = (val: string) => {
    if (val === '=' ) return styles.btnEqual;
    if (['÷', '×', '−', '+'].includes(val)) return styles.btnOperator;
    if (['C', '+/−', '%'].includes(val)) return styles.btnFunction;
    if (val === '⌫') return styles.btnBackspace;
    return styles.btnNumber;
  };

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        <div className={styles.calculator}>
          {/* Display */}
          <div className={styles.display}>
            <div className={styles.expressionBar}>
              {expression || '\u00A0'}
            </div>
            <div className={styles.mainDisplay}>
              {display}
            </div>
          </div>

          {/* Buttons */}
          <div className={styles.grid}>
            {buttons.map((row, ri) =>
              row.map((btn, ci) => (
                <button
                  key={`${ri}-${ci}`}
                  className={`${styles.btn} ${getButtonClass(btn)}`}
                  onClick={() => handleButton(btn)}
                  aria-label={btn}
                >
                  {btn}
                </button>
              ))
            )}
          </div>

          {/* History toggle */}
          <button
            className={styles.historyToggle}
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className={styles.historyPanel}>
            <div className={styles.historyHeader}>
              <h2>History</h2>
              <button
                className={styles.clearHistoryBtn}
                onClick={clearHistory}
              >
                Clear All
              </button>
            </div>
            {historyLoading ? (
              <div className={styles.historyEmpty}>Loading...</div>
            ) : history.length === 0 ? (
              <div className={styles.historyEmpty}>No calculations yet.</div>
            ) : (
              <ul className={styles.historyList}>
                {history.map((item) => (
                  <li
                    key={item.id}
                    className={styles.historyItem}
                    onClick={() => {
                      setDisplay(item.result);
                      setExpression(item.expression + ' =');
                      setJustEvaluated(true);
                    }}
                  >
                    <span className={styles.historyExpr}>{item.expression}</span>
                    <span className={styles.historyResult}>= {item.result}</span>
                    <span className={styles.historyDate}>
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
