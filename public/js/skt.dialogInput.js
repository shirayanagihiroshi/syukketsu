/*
 * skt.dialogInput.js
 * 文字入力可能な ダイアログ部モジュール
 */
skt.dialogInput = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
        + '<div class="skt-dialogInput">'
          + '<div class="skt-dialogInput-head">'
            + '<div class="skt-dialogInput-head-closer">'
              + '<p>x</p>'
            + '</div>'
          + '</div>'
          + '<div class="skt-dialogInput-main">'
            + '<div class="skt-dialogInput-main-detail"></div>'
            + '<div class="skt-dialogInput-main-memo"></div>'
            + '<input type="text" class="skt-dialogInput-main-textbox">'
            + '<button class="skt-dialogInput-main-button-ok">'
              + '<p>ok</p>'
            + '</button>'
            + '<button class="skt-dialogInput-main-button-cancel">'
              + '<p>cancel</p>'
            + '</button>'
          + '</div>'
        + '<div>',
        settable_map : { detailStr    : true,
                         textboxTitle : true,
                         okFunc       : true },
        detailStr    : "",
        textboxTitle : "",
        okFunc       : function () {}
      },
      stateMap = {
        $append_target : null
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeDialog, onClose, onOK;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $append_target = stateMap.$append_target,
        $dialog = $append_target.find( '.skt-dialogInput' );
    jqueryMap = {
      $dialog          : $dialog,
      $closer          : $dialog.find( '.skt-dialogInput-head-closer' ),
      $detail          : $dialog.find( '.skt-dialogInput-main-detail' ),
      $memo            : $dialog.find( '.skt-dialogInput-main-memo' ),
      $textbox         : $dialog.find( '.skt-dialogInput-main-textbox' ),
      $buttonOK        : $dialog.find( '.skt-dialogInput-main-button-ok' ),
      $buttonCancel    : $dialog.find( '.skt-dialogInput-main-button-cancel' )
    };
  }

  //---イベントハンドラ---
  onClose = function () {
    $.gevent.publish('cancelDialog', [{}]);
    return false;
  }

  onOK = function () {
    let memoStr = jqueryMap.$textbox.val();
    configMap.okFunc(memoStr);
    return false;
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

  removeDialog = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$dialog ) {
        jqueryMap.$dialog.remove();
        jqueryMap = null;
      }
    }
    stateMap.$append_target = null;
    return true;
  }

  initModule = function ( $append_target ) {
    // $container.html( configMap.main_html );
    // じゃなくて、appendするパターン
    // shellでコンテナを用意すると、dialog側を消してもコンテナが残っちゃう。
    $append_target.append( configMap.main_html );
    stateMap.$append_target = $append_target;
    setJqueryMap();

    jqueryMap.$detail.html(configMap.detailStr);
    jqueryMap.$memo.html(configMap.textboxTitle);

    jqueryMap.$buttonOK
      .click( onOK );
    jqueryMap.$closer
      .click( onClose );
    jqueryMap.$buttonCancel
      .click( onClose );

    return true;
  }

  return {
    configModule : configModule,
    initModule   : initModule,
    removeDialog : removeDialog,
    onClose      : onClose
  };
}());
