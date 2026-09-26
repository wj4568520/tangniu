// 模板占位模块
// drpy2 引擎启动时会调用 模板.getMubans() 读取模板库；
// 本站点不使用任何页面模板，返回空对象即可，避免引擎初始化报错。
export default {
    getMubans: function () {
        return {};
    }
};
