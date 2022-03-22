/*
 * skt.proxy.js
 * 代理で入力モジュール
 */
skt.proxy = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<div class="skt-proxy-title">下記のクラスの出欠を入力します。担任が不在の場合のみ使用してください。</div>'
          + '<table class="skt-proxy-main"></table>',
        header    : String()
          + '<tr><td>学年/組</td><td>入力</td></tr>',
        inputButton : 'skt-proxy-input',
        settable_map : {},
        allMeibo : {}
      },
      stateMap = {
        $container : null,
        gakunen    : 0,
        cls        : 0
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeProxy, createTable,
      addButton, gakunenCls2Id, id2GakunenCls;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container : $container,
      $title     : $container.find( '.skt-proxy-title' ),
      $main      : $container.find( '.skt-proxy-main' )
    };
  }

  //---イベントハンドラ---

  //---ユーティリティメソッド---
  createTable = function() {
    let i, j, cl, str,
        gakunenArr = [1,2,3,4,5,6]; //1から3は中学
                                    //4から6は高校

    jqueryMap.$main.append(configMap.header);

    for (i =0; i < gakunenArr.length; i++) {
      cl = skt.model.getClsList(configMap.allMeibo,gakunenArr[i]);
      for (j =0; j < cl.length; j++) {
        str =  '<tr>';
        str +=   '<td>';
        str +=     skt.model.showGakunen(gakunenArr[i]);
        str +=     skt.model.showCls(gakunenArr[i], cl[j]);
        str +=   '</td>';
        str +=   '<td>';
        str +=     addButton(gakunenArr[i],cl[j]);
        str +=   '</td>';
        str += '</tr>';

        jqueryMap.$main.append(str);
      }
    }
  }

  addButton = function (gakunen, cls) {
    return '<button class="' + configMap.inputButton + '" '
         + 'id="' + gakunenCls2Id(gakunen, cls) + '">'
         + '入力'
         + '</button>';
  }

  gakunenCls2Id = function (gakunen, cls) {
    // 0パディングで２桁
    return (('00' + String(gakunen)).slice(-2) + ('00' + String(cls)).slice(-2));
  }

  id2GakunenCls = function (str) {
    let gakunen = Number(str.slice(0,2)),
        cls     = Number(str.slice(2,4));
    return ({ gakunen : gakunen,
              cls     : cls});
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

    configMap.allMeibo = skt.model.getAllClass();

    createTable();

    // 重複して登録すると、何度もイベントが発行される。それを避けるため、一旦削除
    $(document).off('click');

    // 入力ボタンの登録
    $(document).on('click', ('.' + configMap.inputButton), function (event) {
      let targetcls = id2GakunenCls(this.id);

      stateMap.gakunen = targetcls.gakunen;
      stateMap.cls     = targetcls.cls;

      // 代理で入力するクラスを選んでいるので、そのクラスの名簿や
      // 出欠を取得する。この後、readySyukketsuResult を受けて入力画面へ遷移する。
      skt.model.setTargetClass('input', stateMap.gakunen, stateMap.cls);
    });

    return true;
  }

  removeProxy = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {

        jqueryMap.$title.remove();
        jqueryMap.$main.remove();
      }
    }
    return true;
  }

  return {
    configModule   : configModule,
    initModule     : initModule,
    removeProxy    : removeProxy
  };
}());
