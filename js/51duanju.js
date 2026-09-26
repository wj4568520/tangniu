// 51短剧 (blue.xdrgcewe.cc) — 影视仓 / TVBox drpy2 规则
// 接口: https://wj-api-51dj.yvyjdhr.com
// 协议: 表单POST + AES-128-CBC 加密 data 字段 + SHA256→MD5 签名
// 说明: 一级/搜索/二级/lazy 均采用 drpy2 要求的 "js:" 代码字符串格式

var rule = {
    title: '51短剧',
    host: 'https://blue.xdrgcewe.cc',
    api_host: 'https://wj-api-51dj.yvyjdhr.com',
    homeUrl: '',
    url: '/api/home/recommendDetail',
    searchUrl: '/api/search/result',
    detailUrl: '/api/playlet/detail',
    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    play_parse: true,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Origin': 'https://blue.xdrgcewe.cc',
        'Referer': 'https://blue.xdrgcewe.cc/',
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    // module_id 1=热门精选 3=甜宠爱情 4=逆袭重生 5=古装穿越 6=都市情感 7=悬疑烧脑 8=战神归来 9=豪门恩怨
    // 注意：module_id 2 / 10 是「演员」模块（data_type=2），非短剧，故不列入分类
    class_name: '热门精选&甜宠爱情&逆袭重生&古装穿越&都市情感&悬疑烧脑&战神归来&豪门恩怨',
    class_url: '1&3&4&5&6&7&8&9',

    // ============ 加密 / 签名 / 请求 工具方法 ============
    aesKey: CryptoJS.enc.Utf8.parse('2acf7e91e9864673'),
    aesIv: CryptoJS.enc.Utf8.parse('1c29882d3ddfcfd6'),
    signKey: '5589d41f92a597d016b037ac37db243d',

    encrypt: function (text) {
        return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(text), this.aesKey, {
            iv: this.aesIv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }).toString();
    },

    decrypt: function (cipher) {
        return CryptoJS.AES.decrypt(cipher, this.aesKey, {
            iv: this.aesIv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);
    },

    sign: function (enc, ts) {
        var raw = '_ver=v0&client=web_h5&data=' + enc + '&timestamp=' + ts + this.signKey;
        return CryptoJS.MD5(CryptoJS.SHA256(raw).toString()).toString();
    },

    postApi: function (path, params) {
        var ts = Math.floor(Date.now() / 1000).toString();
        var enc = this.encrypt(JSON.stringify(params || {}));
        var body = '_ver=v0&client=web_h5&data=' + enc + '&timestamp=' + ts + '&sign=' + this.sign(enc, ts);
        var resp = post(this.api_host + path, { body: body, headers: this.headers });
        var json = JSON.parse(resp);
        if (json.data) {
            try {
                json._dec = JSON.parse(this.decrypt(json.data));
            } catch (e) {
                console.log('解密失败:' + e.message);
            }
        }
        return json;
    },

    // ============ 首页推荐 ============
    推荐: "js:var r=rule.postApi('/api/home/recommendDetail',{module_id:1,page:1,page_size:20});var L=[];var D=(r._dec&&r._dec.data)||{};(D.list||[]).forEach(function(it){L.push({title:it.title,url:'/api/playlet/detail?video_id='+it.video_id,pic_url:it.cover,desc:(it.tags||[]).join(' / ')+(it.play_count_text||'')})});setResult(L)",

    // ============ 分类列表（一级）============
    一级: "js:var r=rule.postApi('/api/home/recommendDetail',{module_id:parseInt(MY_CATE||'1'),page:parseInt(MY_PAGE||1),page_size:30});var L=[];var D=(r._dec&&r._dec.data)||{};(D.list||[]).forEach(function(it){L.push({title:it.title,url:'/api/playlet/detail?video_id='+it.video_id,pic_url:it.cover,desc:(it.tags||[]).join(' / ')+(it.play_count_text||'')})});setResult(L)",

    // ============ 搜索 ============
    搜索: "js:var r=rule.postApi('/api/search/result',{keyword:KEY,page:parseInt(MY_PAGE||1),page_size:20});var L=[];var D=(r._dec&&r._dec.data)||{};(D.list||[]).forEach(function(it){L.push({title:it.title,url:'/api/playlet/detail?video_id='+(it.video_id||it.id),pic_url:it.cover,desc:(it.description||'').substring(0,60),content:it.actors||''})});setResult(L)",

    // ============ 详情 + 选集（二级）============
    二级: "js:var qs={};(input.split('?')[1]||'').split('&').forEach(function(p){var kv=p.split('=');if(kv[0])qs[kv[0]]=kv[1]});var vid=parseInt(qs.video_id);var r=rule.postApi('/api/playlet/detail',{video_id:vid});var D=(r._dec&&r._dec.data)||{};VOD={vod_id:String(vid),vod_name:D.title||'',vod_pic:D.cover||'',vod_content:D.description||'',vod_actor:(D.actor_list||[]).map(function(a){return a.name}).join(' / '),vod_director:'',vod_year:(D.seo_published_at||'').substring(0,4),vod_area:'',vod_remarks:(D.serialize_status_text||'')+(D.play_count_text?(' '+D.play_count_text):''),vod_play_from:'51短剧',vod_play_url:(D.episodes||[]).map(function(ep){return ep.title+'$'+rule.api_host+'/api/playlet/play?video_id='+vid+'&episode_id='+ep.id}).join('#')}",

    // ============ 播放（懒解析，实时换取签名 m3u8）============
    lazy: "js:var qs={};(input.split('?')[1]||'').split('&').forEach(function(p){var kv=p.split('=');if(kv[0])qs[kv[0]]=kv[1]});var r=rule.postApi('/api/playlet/play',{video_id:parseInt(qs.video_id),episode_id:parseInt(qs.episode_id)});var D=(r._dec&&r._dec.data)||{};var u=D.video_url||D.video_url_h265||'';if(u){input={parse:0,jx:0,url:u}}"
};
