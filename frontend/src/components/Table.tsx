import React from 'react';
import { Language } from '../types';
import { t } from '../locales/i18n';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  rows: T[];
  columns: Column<T>[];
  lang: Language;
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
}

export function Table<T extends Record<string, any>>({
  rows,
  columns,
  lang,
  onSort,
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={() => onSort?.(c.key)}
                className="cursor-pointer select-none"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-[#2a9d8f11]' : ''}
              >
                {columns.map((c) => (
                  <td key={c.key}>
                    {c.render ? c.render(row) : String(row[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="mu text-center">
                {t('none', lang)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
