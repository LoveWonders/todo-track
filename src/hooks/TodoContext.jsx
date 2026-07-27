import { createContext, useContext } from 'react';

const TodoActionsContext = createContext(null);
const TodoViewContext = createContext(null);

export function TodoProvider({ actions, view, children }) {
  return (
    <TodoActionsContext.Provider value={actions}>
      <TodoViewContext.Provider value={view}>
        {children}
      </TodoViewContext.Provider>
    </TodoActionsContext.Provider>
  );
}

export function useTodoActions() {
  const ctx = useContext(TodoActionsContext);
  if (!ctx) throw new Error('useTodoActions must be used within TodoProvider');
  return ctx;
}

export function useTodoView() {
  const ctx = useContext(TodoViewContext);
  if (!ctx) throw new Error('useTodoView must be used within TodoProvider');
  return ctx;
}
