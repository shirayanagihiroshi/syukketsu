/*
 * skt.addGoudouMeibo.js
 * 合同名簿追加モジュール
 */
skt.addGoudouMeibo = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<h1 class="skt-addGoudouMeibo-text1">登録済のIDの表示</h1>'
          + '<ul class="skt-addGoudouMeibo-registered"></ul>'
          + '<h1 class="skt-addGoudouMeibo-text2">新規登録</h1>'
          + '<p class="skt-addGoudouMeibo-text3">下記のように追加する合同名簿IDを指定する</p>'
          + '<pre class="skt-addGoudouMeibo-text4">'
          + '[<br>'
          + ' {"goudouMeiboId" : 67,<br>'
          + '  "explanation" : "数学総合演習",<br>'
          + '  "students" : [{"gakunen":6,"cls":2,"bangou":1,"name":"テスト1子"}<br>'
          + '               ,{"gakunen":6,"cls":2,"bangou":2,"name":"テスト2子"}<br>'
          + '               ,{"gakunen":6,"cls":2,"bangou":3,"name":"テスト3子"}<br>'
          + '  ]}<br>'
          + ',{"goudouMeiboId" : 68,<br>'
          + '  "explanation" : "古典演習",<br>'
          + '  "students" : [{"gakunen":5,"cls":3,"bangou":1,"name":"テスト1男"}<br>'
          + '               ,{"gakunen":5,"cls":3,"bangou":2,"name":"テスト2男"}<br>'
          + '               ,{"gakunen":5,"cls":3,"bangou":3,"name":"テスト3男"}<br>'
          + '  ]}<br>'
          + ']<br></pre>'
          + '<textarea class="skt-addGoudouMeibo-textarea"></textarea>'
          + '<p><button class="skt-addGoudouMeibo-regist">登録</button></p>'
      },
      stateMap = {
        $container : null
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, reGetAllGoudouMeibo, removeAddGoudouMeibo,
      createList, onRegist;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container  : $container,
      $text1      : $container.find( '.skt-addGoudouMeibo-text1'      ),
      $registered : $container.find( '.skt-addGoudouMeibo-registered' ),
      $text2      : $container.find( '.skt-addGoudouMeibo-text2'      ),
      $text3      : $container.find( '.skt-addGoudouMeibo-text3'      ),
      $text4      : $container.find( '.skt-addGoudouMeibo-text4'      ),
      $textarea   : $container.find( '.skt-addGoudouMeibo-textarea'   ),
      $regist     : $container.find( '.skt-addGoudouMeibo-regist'     )
    };
  }

  //---イベントハンドラ---

  //---ユーティリティメソッド---
  createList = function() {
    let i, str,
      allGoudoumeibo = skt.model.getAllGoudouMeibo(),
      f = function (a, b) {
        if (a.goudouMeiboId < b.goudouMeiboId) {
          return -1;
        } else if (a.goudouMeiboId > b.goudouMeiboId) {
          return 1;
        }
        return 0;
      };

    allGoudoumeibo.sort(f);

    for (i = 0; i < allGoudoumeibo.length; i++) {
      str = '<li>' + String(allGoudoumeibo[i].goudouMeiboId);
      if (Object.keys(allGoudoumeibo[i]).indexOf('explanation') != -1) {
        str += '(' + String(allGoudoumeibo[i].explanation) + ')';
      }
      str += '</li>';
      jqueryMap.$registered.append(str);
    }
  }

  onRegist = function (gakunen, cls) {
    let newDataStr = jqueryMap.$textarea.val(),
      newData = JSON.parse(newDataStr);

    skt.model.addGoudouMeibo(newData);
  }

  //---パブリックメソッド---
  configModule = function ( input_map ) {
    skt.util.setConfigMap({
      input_map : input_map,
      settable_map : configMap.settable_map,
      config_map : configMap
    });
    return true;
  }

  initModule = function ( $container ) {
    $container.html( configMap.main_html );
    stateMap.$container = $container;
    setJqueryMap();

    createList();

    // 重複して登録すると、何度もイベントが発行される。それを避けるため、一旦削除
    $(document).off('click');

    jqueryMap.$regist
      .click( onRegist );

    return true;
  }

  reGetAllGoudouMeibo = function () {
    skt.model.readyAllGoudouMeibo('afterAdd'); //clientStateは現状未使用
  }

  removeAddGoudouMeibo = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {
        jqueryMap.$text1.remove();
        jqueryMap.$registered.remove();
        jqueryMap.$text2.remove();
        jqueryMap.$text3.remove();
        jqueryMap.$text4.remove();
        jqueryMap.$textarea.remove();
        jqueryMap.$regist.remove();
      }
    }
    return true;
  }

  return {
    configModule         : configModule,
    initModule           : initModule,
    reGetAllGoudouMeibo  : reGetAllGoudouMeibo,
    removeAddGoudouMeibo : removeAddGoudouMeibo
  };
}());
