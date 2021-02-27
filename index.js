const postcss = require("postcss");
const list = require("postcss/lib/list");
const vars = require("postcss-simple-vars");

module.exports = (opts) => {
  return {
    postcssPlugin: "utilitycss-postcss-for",
    Once(css) {
      opts = opts || {};
      opts.nested = opts.nested || true;

      const iterStack = [];

      const parentsHaveIterator = function (rule, param) {
        if (rule.parent == null) {
          return false;
        }
        if (rule.parent.type === "root") {
          return false;
        }
        if (rule.parent.params == null) {
          return false;
        }

        var parentIterVar = list.space(rule.parent.params);

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

      const manageIterStack = function (rule) {
        if (rule.parent.type !== "root") {
          var parentIterVar =
            rule.parent.params && list.space(rule.parent.params)[0];
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

      const checkNumber = function (rule) {
        return function (param) {
          if (isNaN(parseInt(param)) || !param.match(/^-?\d+\.?\d*$/)) {
            if (param.indexOf("$") !== -1) {
              if (!parentsHaveIterator(rule, param)) {
                throw rule.error(
                  "External variable (not from a parent for loop) cannot be used as a range parameter",
                  { plugin: "postcss-for" }
                );
              }
            } else {
              throw rule.error("Range parameter should be a number", {
                plugin: "postcss-for",
              });
            }
          }
        };
      };

      const checkParams = function (rule, params) {
        if (
          !params[0].match(/(^|[^\w])\$([\w\d-_]+)/) ||
          params[1] !== "from" ||
          params[3] !== "to" ||
          (params[5] !== "by") ^ (params[5] === undefined)
        ) {
          throw rule.error("Wrong loop syntax", { plugin: "postcss-for" });
        }

        [params[2], params[4], params[6] || "0"].forEach(checkNumber(rule));
      };

      const unrollLoop = async function (rule) {
        var params = list.space(rule.params);

        checkParams(rule, params);

        var iterator = params[0].slice(1),
          index = +params[2],
          top = +params[4],
          dir = top < index ? -1 : 1,
          by = (params[6] || 1) * dir;

        let value = {};
        for (var i = index; i * dir <= top * dir; i = i + by) {
          value[iterator] = i;
          let content = rule.clone();
          // vars({ only: value })(content);
          const newCSS = postcss([
            vars({
              only: value,
            }),
          ]).process(content.nodes);
          console.log("newCSS", content);
          if (opts.nested) {
            processLoops(content);
          }
          rule.parent.insertBefore(rule, newCSS.css);
        }
        if (rule.parent) {
          rule.remove();
        }
      };

      const processLoops = function (css) {
        css.walkAtRules(function (rule) {
          if (rule.name === "for") {
            unrollLoop(rule);
          }
        });
      };

      const processOriginalLoops = function (css) {
        css.walkAtRules(function (rule) {
          if (rule.name === "for") {
            if (rule.parent) {
              manageIterStack(rule);
            }
            unrollLoop(rule);
          }
        });
      };

      processOriginalLoops(css);
      return css;
    },
  };
};

module.exports.postcss = true;
