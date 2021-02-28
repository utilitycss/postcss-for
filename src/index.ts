import { Plugin, AtRule, Container, list } from "postcss";
import postcssFn from "postcss";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const vars = require("postcss-simple-vars");

const PLUGIN_NAME = "utilitycss-postcss-for";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require("debug")(PLUGIN_NAME);

const plugin = (): Plugin => {
  const iterStack: string[] = [];
  const value: {
    [key: string]: number;
  } = {};
  const manageIterStack = (rule: AtRule) => {
    if (rule.parent.type !== "root") {
      debug("rule.parent", (rule.parent as any)?.params);
      const parentIterVar =
        (rule.parent as any).params &&
        list.space((rule.parent as any).params)[0];
      if (iterStack.indexOf(parentIterVar) === -1) {
        // If parent isn't in stack, wipe stack
        iterStack.splice(0, iterStack.length);
      } else {
        // If parent is in stack, remove stack after parent
        iterStack.splice(
          iterStack.indexOf(parentIterVar) + 1,
          iterStack.length - iterStack.indexOf(parentIterVar) - 1
        );
      }
    } else {
      // If parent (root) isn't in stack, wipe stack
      iterStack.splice(0, iterStack.length);
    }
    // Push current rule on stack regardless
    iterStack.push(list.space(rule.params)[0]);
  };

  const parentsHaveIterator = (
    rule: AtRule | Container,
    param: string
  ): boolean => {
    if (rule.parent == null) {
      return false;
    }
    if (rule.parent.type === "root") {
      return false;
    }
    if ((rule.parent as any).params == null) {
      return false;
    }

    const parentIterVar = list.space((rule.parent as any).params);

    if (parentIterVar[0] == null) {
      return false;
    }
    if (parentIterVar[0] === param) {
      return true;
    }
    if (iterStack.indexOf(param) !== -1) {
      return true;
    }
    return parentsHaveIterator(rule.parent, param);
  };

  const checkNumber = (rule: AtRule) => {
    return (param: string) => {
      debug("param", param);
      if (isNaN(parseInt(param)) || !param.match(/^-?\d+\.?\d*$/)) {
        debug("Number is NaN");
        if (param.indexOf("$") !== -1) {
          if (!parentsHaveIterator(rule, param)) {
            throw new Error(
              "External variable (not from a parent for loop) cannot be used as a range parameter"
            );
          }
        } else {
          throw new Error("Range parameter should be a number");
        }
      }
    };
  };

  const validateParams = (rule: AtRule, params: string[]) => {
    const [one, two, three, four, five, six, seven] = params;
    if (
      !one.match(/(^|[^\w])\$([\w\d-_]+)/) ||
      two !== "from" ||
      four !== "to" ||
      (six !== "by") !== (six === undefined)
    ) {
      throw new Error("Wrong loop syntax");
    }

    const paramsToCheckForNumber = [three, five, seven || "0"];
    debug("checkNumber", paramsToCheckForNumber);

    paramsToCheckForNumber.forEach(checkNumber(rule));
  };

  const unrollLoop = (rule: AtRule) => {
    const params = list.space(rule.params);

    validateParams(rule, params);

    // debug("params", params);

    const [one, _, three, __, five, ___, seven] = params;

    const iterator = one.slice(1);
    const index = +three;
    const top = +five;
    const dir = top < index ? -1 : 1;
    const by = (+seven || 1) * dir;

    /* debug(`iterator => ${iterator}`);
    debug(`index => ${index}`);
    debug(`top => ${top}`);
    debug(`dir => ${dir}`);
    debug(`by => ${by}`); */

    for (let i = index; i * dir <= top * dir; i = i + by) {
      value[iterator] = i;
      const content = rule.clone();
      debug("content.nodes", content.nodes);
      const newCSS = postcssFn([
        vars({
          only: value,
        }),
      ]).process(content.nodes);

      debug("newCSS.css", newCSS.css);

      rule.parent.insertBefore(rule, newCSS.css.split(",").join(""));
    }
  };

  return {
    postcssPlugin: PLUGIN_NAME,
    AtRule: {
      for: async (atRule) => {
        if (atRule.parent) {
          manageIterStack(atRule);
        }
        debug(iterStack);
        try {
          unrollLoop(atRule);

          if (atRule.parent) {
            debug("Removing node.");
            atRule.remove();
          }
        } catch (err) {
          throw atRule.error(err, {
            plugin: PLUGIN_NAME,
          });
        }
      },
    },
  };
};

export default plugin;

export const postcss = true;
