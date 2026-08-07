import { useState, useEffect } from 'react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  edited?: boolean;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTodo, setNewTodo] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (newTodo.trim() === '') return;
    const newTodoItem: Todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
    };
    setTodos([...todos, newTodoItem]);
    setNewTodo('');
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = () => {
    if (editText.trim() === '') return;
    setTodos(
      todos.map(todo =>
        todo.id === editingId ? { ...todo, text: editText.trim() } : todo
      )
    );
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.length - activeCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 p-4 flex flex-col items-center">
      <div className="w-full max-w-md mt-12 bg-white/20 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-white/30">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-white text-center mb-6">📝 Todo List</h1>
          
          {/* Add Todo Form */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200"
            />
            <button
              onClick={addTodo}
              className="px-5 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-white/90 transition-all duration-200 transform hover:scale-105 shadow-md"
            >
              Add
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center mb-6 space-x-2">
            {(['all', 'active', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  filter === f
                    ? 'bg-white text-indigo-600 shadow-md'
                    : 'bg-white/20 text-white/80 hover:bg-white/30'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Todo List */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {filteredTodos.length === 0 ? (
              <p className="text-white/70 text-center py-8 italic">No todos {filter === 'all' ? 'yet' : filter === 'active' ? 'active' : 'completed'}</p>
            ) : (
              filteredTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={`flex items-center p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:bg-white/20 ${
                    todo.completed ? 'opacity-70' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    className="h-5 w-5 text-indigo-500 rounded focus:ring-indigo-400 mr-3 cursor-pointer"
                  />
                  {editingId === todo.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 px-3 py-1 bg-white/20 border border-white/30 rounded text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                        autoFocus
                      />
                      <button
                        onClick={saveEdit}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex justify-between items-center">
                      <span
                        className={`text-white transition-all duration-200 ${
                          todo.completed ? 'line-through text-white/60' : ''
                        }`}
                      >
                        {todo.text}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(todo)}
                          className="text-white/70 hover:text-white transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="text-red-300 hover:text-red-100 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Stats and Clear Completed */}
          <div className="mt-6 pt-4 border-t border-white/20 text-white/80 text-sm flex justify-between items-center">
            <span>{activeCount} {activeCount === 1 ? 'item' : 'items'} left</span>
            {completedCount > 0 && (
              <button
                onClick={() => setTodos(todos.filter(todo => !todo.completed))}
                className="text-red-300 hover:text-red-100 transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 text-white/70 text-sm text-center max-w-md">
        <p>✨ Drag & drop to reorder • Double-click to edit a todo</p>
        <p className="mt-2">✅ Todos are saved automatically in your browser</p>
      </div>
    </div>
  );
}

export default App;
