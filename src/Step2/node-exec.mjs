import { spawn } from 'node:child_process';

// const command = 'ls -la';
const command = 'echo -e "n/nn" | pnpm create vite react-todo-app --template react-ts';
const cwd = process.cwd();

const [cmd, ...args] = command.split(' ');

console.log(`Executing command: ${cmd} ${args.join(' ')} in directory: ${cwd}`);

const child = spawn(cmd, args, { 
  cwd,
  stdio: 'inherit',
  shell: true
});

let errorMsg = '';

child.on('error', (err) => {
  console.error('Failed to start command:', err);
  errorMsg = err.message;
})

child.on('close', (code) => {
  console.log(`Command exited with code: ${code}`);
  if (code === 0) {
   process.exit(0);
  } else {
    if (errorMsg) { 
      console.error('Error executing command:', errorMsg);
    }
    process.exit(code || 1);
  }
});
