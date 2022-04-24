/*
 * skt.kyuugaku.js
 * 休学設定モジュール
 */
skt.kyuugaku = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<div class="skt-kyuugaku-title">休学する生徒、期間の設定</div>'
          + '<div class="skt-kyuugaku-gakunen-title">学年</div>'
          + '<select class="skt-kyuugaku-gakunen">'
          + '<option value="1">中学1年</option>'
          + '<option value="2">中学2年</option>'
          + '<option value="3">中学3年</option>'
          + '<option value="4">高校1年</option>'
          + '<option value="5">高校2年</option>'
          + '<option value="6">高校3年</option>'
          + '</select>'
          + '<div class="skt-kyuugaku-cls-title">組</div>'
          + '<select class="skt-kyuugaku-cls">'
          + '</select>'
          + '<div class="skt-kyuugaku-members-title">氏名</div>'
          + '<select class="skt-kyuugaku-members">'
          + '</select>'
          + '<input class="skt-kyuugaku-update" type="button" value="登録">'
          + '<div class="skt-kyuugaku-notice">※生徒を選択してから事由、期間を入力してください。</div>'
          + '<div class="skt-kyuugaku-jiyuuT">事由：</div>'
          + '<input type="text" class="skt-kyuugaku-jiyuu">'
          + '<div class="skt-kyuugaku-term-start-yearT">年</div>'
          + '<input type="text" class="skt-kyuugaku-term-start-year">'
          + '<div class="skt-kyuugaku-term-start-monthT">月</div>'
          + '<input type="text" class="skt-kyuugaku-term-start-month">'
          + '<div class="skt-kyuugaku-term-start-dayT">日</div>'
          + '<input type="text" class="skt-kyuugaku-term-start-day">'
          + '<div class="skt-kyuugaku-term-kara">から</div>'
          + '<div class="skt-kyuugaku-term-end-yearT">年</div>'
          + '<input type="text" class="skt-kyuugaku-term-end-year">'
          + '<div class="skt-kyuugaku-term-end-monthT">月</div>'
          + '<input type="text" class="skt-kyuugaku-term-end-month">'
          + '<div class="skt-kyuugaku-term-end-dayT">日</div>'
          + '<input type="text" class="skt-kyuugaku-term-end-day">'
          + '<hr class="skt-kyuugaku-separation">'
          + '<div class="skt-kyuugaku-register"></div>',
        settable_map : {},
        allMeibo : {}
      },
      stateMap = {
        $container             : null,
        dropDownListPosCls     : 1,  // リストを操作し登録対象の生徒を選ぶ時に使う
        targetSyussekibangou   : 0,  // リストを操作し登録対象の生徒を選ぶ時に使う
        targetName             : "", // リストを操作し登録対象の生徒を選ぶ時に使う
        target                 : {}  // チェック済の登録対象
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeKyuugaku,
      setDropDownList, verify, redraw, onUpdate, showRegisteredList,
      showRegisteredInner;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container    : $container,
      $title        : $container.find( '.skt-kyuugaku-title'            ),
      $gakunenlistT : $container.find( '.skt-kyuugaku-gakunen-title'    ),
      $gakunenlist  : $container.find( '.skt-kyuugaku-gakunen'          ),
      $clslistT     : $container.find( '.skt-kyuugaku-cls-title'        ),
      $clslist      : $container.find( '.skt-kyuugaku-cls'              ),
      $memberlistT  : $container.find( '.skt-kyuugaku-members-title'    ),
      $memberlist   : $container.find( '.skt-kyuugaku-members'          ),
      $notice       : $container.find( '.skt-kyuugaku-notice'           ),
      $update       : $container.find( '.skt-kyuugaku-update'           ),
      $jiyuu        : $container.find( '.skt-kyuugaku-jiyuu'            ),
      $sYear        : $container.find( '.skt-kyuugaku-term-start-year'  ),
      $sMonth       : $container.find( '.skt-kyuugaku-term-start-month' ),
      $sDay         : $container.find( '.skt-kyuugaku-term-start-day'   ),
      $eYear        : $container.find( '.skt-kyuugaku-term-end-year'    ),
      $eMonth       : $container.find( '.skt-kyuugaku-term-end-month'   ),
      $eDay         : $container.find( '.skt-kyuugaku-term-end-day'     ),
      $regList      : $container.find( '.skt-kyuugaku-register'         )
    };
  }

  //---イベントハンドラ---
  verify = function () {
    let jiyuu = jqueryMap.$jiyuu.val(),
      sYear   = jqueryMap.$sYear.val(),
      sMonth  = jqueryMap.$sMonth.val(),
      sDay    = jqueryMap.$sDay.val(),
      eYear   = jqueryMap.$eYear.val(),
      eMonth  = jqueryMap.$eMonth.val(),
      eDay    = jqueryMap.$eDay.val();

    if (jiyuu  == "" ||
        sYear  == "" || isNaN(sYear)  ||
        sMonth == "" || isNaN(sMonth) ||
        sDay   == "" || isNaN(sDay)   ||
        eYear  == "" || isNaN(eYear)  ||
        eMonth == "" || isNaN(eMonth) ||
        eDay   == "" || isNaN(eDay) ) {

      $.gevent.publish('invalidInput', [{errStr:'入力が不正です'}]);

    // 入力が正常っぽければ登録処理へ
    } else {
      $.gevent.publish('verifyKGUpdate', [{}]);
    }
  }

  onUpdate = function () {
    let obj = {gakunen  : Number( jqueryMap.$gakunenlist.val() ),
               cls      : Number( jqueryMap.$clslist.val()     ),
               bangou   : Number( jqueryMap.$memberlist.val()  ),
               jiyuu    : jqueryMap.$jiyuu.val(),
               sYear    : Number( jqueryMap.$sYear.val()       ),
               sMonth   : Number( jqueryMap.$sMonth.val()      ),
               sDay     : Number( jqueryMap.$sDay.val()        ),
               eYear    : Number( jqueryMap.$eYear.val()       ),
               eMonth   : Number( jqueryMap.$eMonth.val()      ),
               eDay     : Number( jqueryMap.$eDay.val()        )}

    // 登録処理
    skt.model.updateKyuugaku( obj );
  }


  //---ユーティリティメソッド---

  // skt.renraku.js と同じ処理
  // 学園、組を指定して、組、生徒のドロップダウンリストを更新する。
  // ダサいが最初だけ、initflgを立てる。
  setDropDownList = function ( gakunen, cls , initflg = false) {
    let i, cl, ml, clsNotExist = false;

    // 学年
    jqueryMap.$gakunenlist.val( gakunen );

    // クラスのリスト
    // 削除する前に位置を保持
    if ( initflg != true ) {
      stateMap.dropDownListPosCls = Number( jqueryMap.$clslist.val() );
    }
    // 一旦リストを削除消して
    jqueryMap.$clslist.children().remove();
    // 設定しなおす
    cl = skt.model.getClsList( configMap.allMeibo, gakunen);
    for (i = 0; i < cl.length ; i++) {
      jqueryMap.$clslist.append($('<option>').val(cl[i]).html(
        skt.model.showCls(gakunen, cl[i])));
    }
    // その後、位置を復元
    if ( stateMap.dropDownListPosCls <= cl.length ) {
      jqueryMap.$clslist.val( stateMap.dropDownListPosCls );
    } else {
      clsNotExist = true;
      jqueryMap.$clslist.val(1);
    }

    // 生徒のリスト
    // 一旦リストを削除消して
    jqueryMap.$memberlist.children().remove();
    // 該当クラスのリストを設定しなおす
    ml = skt.model.getMemberList( configMap.allMeibo, gakunen, clsNotExist ? 1 : cls );
    for (i = 0; i < ml.students.length ; i++) {
      jqueryMap.$memberlist.append($('<option>').val(ml.students[i].bangou).html(
        String(ml.students[i].bangou) + '番 ' + ml.students[i].name));
    }
    jqueryMap.$memberlist.val(1);
    stateMap.targetSyussekibangou = ml.students[0].bangou;
    stateMap.targetName           = ml.students[0].name;
  }

  showRegisteredList = function () {
    const msg = '登録済の休学データは以下';
    let i, str,
      kyuugakuData = skt.model.getKyuugaku();

    str = msg;
    str += '<ul>'

    for (i = 0; i < kyuugakuData.length; i++) {
      str += '<li>'
      str += showRegisteredInner(kyuugakuData[i]);
      str += '</li>'
    }
    str += '</ul>'

    jqueryMap.$regList.html(str);
  }

  showRegisteredInner = function (person) {
    let ml, p, str = "",
      f = function (b) {
        return function (target) {
          if ( target.bangou == b ) {
            return true;
          }
        }
      };

    ml = skt.model.getMemberList(configMap.allMeibo, person.gakunen, person.cls);
    p = ml.students.find( f( person.bangou) );

    str += skt.model.showGakunen(person.gakunen);
    str += skt.model.showCls(person.gakunen, person.cls);
    str += String(person.bangou) + '番';
    str += ' '
    str += p.name;
    str += ' '
    str += person.jiyuu;
    str += ' '
    str += String(person.sYear) + '年' + String(person.sMonth) + '月' + String(person.sDay) + '日';
    str += ' '
    str += 'から'
    str += ' '
    str += String(person.eYear) + '年' + String(person.eMonth) + '月' + String(person.eDay) + '日';

    return str;
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

   // 出欠連絡(事務)中に出欠入力(担任)をしてまた出欠連絡(事務)に戻ると
   // ドロップダウンがバグるので初期化しておく。
    stateMap.dropDownListPosCls = 1;

    // とりあえず高校1年1組を表示
    setDropDownList(4, 1, true);

    showRegisteredList();

    jqueryMap.$gakunenlist.change( function () {
      setDropDownList( Number( jqueryMap.$gakunenlist.val() ),
                       Number( jqueryMap.$clslist.val() ) );
      // 一旦テーブルも削除して作り直し
      jqueryMap.$main.children().remove();
//      createTable(stateMap.targetSyussekibangou, stateMap.targetName);
    });

    jqueryMap.$clslist.change(function () {
      setDropDownList( Number( jqueryMap.$gakunenlist.val() ),
                       Number( jqueryMap.$clslist.val() ) );
      // 一旦テーブルも削除して作り直し
      jqueryMap.$main.children().remove();
//      createTable(stateMap.targetSyussekibangou, stateMap.targetName);
    });

    jqueryMap.$memberlist.change( function () {
      let ml, p, f = function (b) {
        return function (target) {
          if ( target.bangou == b ) {
            return true;
          }
        };
      };

      ml = skt.model.getMemberList( configMap.allMeibo,
                                    Number( jqueryMap.$gakunenlist.val() ),
                                    Number( jqueryMap.$clslist.val() ) );

      p = ml.students.find( f( Number( jqueryMap.$memberlist.val() ) ) );
      stateMap.targetSyussekibangou = p.bangou;
      stateMap.targetName           = p.name;

      jqueryMap.$main.children().remove();
//      createTable(stateMap.targetSyussekibangou, stateMap.targetName);
    });

//    createTable(stateMap.targetSyussekibangou, stateMap.targetName);
//    setDayButtons();

    jqueryMap.$update
      .click( verify );

    return true;
  }

  removeKyuugaku = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {
        jqueryMap.$title.remove();
        jqueryMap.$gakunenlistT.remove();
        jqueryMap.$gakunenlist.remove();
        jqueryMap.$clslistT.remove();
        jqueryMap.$clslist.remove();
        jqueryMap.$memberlistT.remove();
        jqueryMap.$memberlist.remove();
        jqueryMap.$notice.remove();
        jqueryMap.$update.remove();
        jqueryMap.$jiyuu.remove();
        jqueryMap.$sYear.remove();
        jqueryMap.$sMonth.remove();
        jqueryMap.$sDay.remove();
        jqueryMap.$eYear.remove();
        jqueryMap.$eMonth.remove();
        jqueryMap.$eDay.remove();
        jqueryMap.$regList.remove();
      }
    }
    return true;
  }

  return {
    configModule  : configModule,
    initModule    : initModule,
    removeKyuugaku : removeKyuugaku,
    redraw        : redraw,
    Update        : onUpdate
  };
}());
