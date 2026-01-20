import type { ISentence } from '@/Core/controller/scene/sceneInterface';
import { type IPerform, initPerform } from '@/Core/Modules/perform/performInterface';
import { SCRIPT_TAG_MAP, type ScriptFunction, scriptRegistry } from '@/Core/parser/sceneParser';
import { WebGAL } from '@/Core/WebGAL';

/**
 * 语句调用器，真正执行语句的调用，并自动将演出在指定时间卸载
 * @param script 调用的语句
 */
export const runScript = (script: ISentence) => {
  // DEBUG: Log script execution
  console.log(`[runScript] ========== EXECUTING ==========`);
  console.log(`[runScript] command: ${script.command} (raw: ${script.commandRaw})`);
  console.log(
    `[runScript] content: "${script.content?.substring(0, 80) ?? ''}${(script.content?.length ?? 0) > 80 ? '...' : ''}"`
  );
  console.log(`[runScript] args: ${JSON.stringify(script.args)}`);
  console.log(`[runScript] ================================`);

  let perform: IPerform = initPerform;
  const funcToRun: ScriptFunction = scriptRegistry[script.command]?.scriptFunction ?? SCRIPT_TAG_MAP.say.scriptFunction; // 默认是say

  // 调用脚本对应的函数
  perform = funcToRun(script);

  if (perform.arrangePerformPromise) {
    perform.arrangePerformPromise.then((resolovedPerform) =>
      WebGAL.gameplay.performController.arrangeNewPerform(resolovedPerform, script)
    );
  } else {
    WebGAL.gameplay.performController.arrangeNewPerform(perform, script);
  }
};
