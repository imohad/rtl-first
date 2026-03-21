import React from 'react';
import { cn } from './utils';

const styles = {
  panel: {
    marginLeft: '16px',
    paddingRight: '8px',
    borderLeft: '1px solid #ccc',
    borderTopLeftRadius: '4px',
  },
  title: {
    textAlign: 'left',
  },
};

export function Panel({ children, isCompact }) {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Panel Title</h2>
      <div className="ml-4 pr-2 border-l-2 text-left">
        Content here
      </div>
      <div className={cn('ml-4', isCompact && 'mr-2', 'border-r-4')}>
        Dynamic classes
      </div>
      <div className={`ml-4 ${isCompact ? 'pr-2' : 'pr-4'}`}>
        Template literal
      </div>
      {children}
    </div>
  );
}

const x = styles.marginLeft;
const y = styles.borderTopLeftRadius;
