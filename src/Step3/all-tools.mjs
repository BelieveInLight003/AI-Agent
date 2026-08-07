import { tool } from '@langchain/core/tools';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

// 读取工具
const readFileTool = tool(
  async (filePath) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      console.log(`  [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`);
      return`文件内容:\n${content}`;
    } catch (error) {
      console.log(`  [工具调用] read_file("${filePath}") - 错误: ${error.message}`);
      return`读取文件失败: ${error.message}`;
    }
  }, {
    name: 'read_file',
    description: '读取指定路径的文件内容',
    schema: z.object({
      filePath: z.string().describe('文件路径'),
    })
  }
)

// 写入工具
const writeFileTool = tool(
  async ({ filePath, content }) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`  [工具调用] write_file("${filePath}") - 成功写入 ${content.length} 字节`);
      return`写入文件成功: ${filePath}`;
    } catch (error) {
      console.log(`  [工具调用] write_file("${filePath}") - 错误: ${error.message}`);
      return`写入文件失败: ${error.message}`;
    }
  }, {
    name: 'write_file',
    description: '写入内容到指定路径的文件',
    schema: z.object({
      filePath: z.string().describe('文件路径'),
      content: z.string().describe('要写入的内容'),
    })
  }
)

// 执行命令工具 带实时输出
const excuteCommandTool = tool(
  async ({ command, workingDirectory, cwd }) => {
    const targetDir = workingDirectory || cwd || process.cwd();
    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(' ');

      console.log(`  [工具调用] execute_command("${command}") - 在目录: ${targetDir} 执行命令`);

      const child = spawn(cmd, args, {
        cwd: targetDir,
        stdio: 'inherit',
        shell: true
      });

      child.on('error', (error) => {
        console.log(`  [工具调用] execute_command("${command}") - 输出: ${error.message}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(`  [工具调用] execute_command("${command}") - 执行成功`);
          const cwdInfo = targetDir !== process.cwd()
            ? `\n\n重要提示：命令在目录 "${targetDir}" 中执行成功。如果需要在这个项目目录中继续执行命令，请使用 workingDirectory: "${targetDir}" 参数，不要使用 cd 命令。`
            : '';
          resolve(`命令执行成功: ${command}${cwdInfo}`);
        } else {
          console.log(`  [工具调用] execute_command("${command}") - 执行失败，退出码: ${code}`);
          resolve(`命令执行失败，退出码: ${code}`);
        }
      });
    });
  }, {
    name: 'execute_command',
    description: '在指定目录下执行命令',
    schema: z.object({
      command: z.string().describe('要执行的命令'),
      workingDirectory: z.string().optional().describe('执行命令的目录'),
      cwd: z.string().optional().describe('兼容旧参数'),
    })
  }
)

// 列出目录内容工具
const listDirectoryTool = tool(
  async ({ directoryPath }) => {
    try {
      const files = await fs.readdir(directoryPath);
      console.log(`  [工具调用] list_directory("${directoryPath}") - 成功列出 ${files.length} 个文件/目录`);
      return`目录内容:\n${files.join('\n')}`;
    } catch (error) {
      console.log(`  [工具调用] list_directory("${directoryPath}") - 错误: ${error.message}`);
      return`列出目录失败: ${error.message}`;
    }
  }, {
    name: 'list_directory',
    description: '列出指定目录的内容',
    schema: z.object({
      directoryPath: z.string().describe('目录路径'),
    })
  }
)

export { readFileTool, writeFileTool, excuteCommandTool, listDirectoryTool };
