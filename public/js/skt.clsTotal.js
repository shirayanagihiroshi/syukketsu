/*
 * skt.clsTotal.js
 * クラス単位集計モジュール
 */
skt.clsTotal = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<input class="skt-clsTotal-startMonth-textbox" type="text">'
          + '<div class="skt-clsTotal-startMonth">月</div>'
          + '<input class="skt-clsTotal-startDay-textbox" type="text">'
          + '<div class="skt-clsTotal-startDay">日から</div>'
          + '<input class="skt-clsTotal-endMonth-textbox" type="text">'
          + '<div class="skt-clsTotal-endMonth">月</div>'
          + '<input class="skt-clsTotal-endDay-textbox" type="text">'
          + '<div class="skt-clsTotal-endDay">日まで</div>'
          + '<input class="skt-clsTotal-calc" type="button" value="再計算">'
          + '<div class="skt-clsTotal-notice"></div>'
          + '<table class="skt-clsTotal-main"></table>',
        settable_map : { startYear  : true,
                         startMonth : true,
                         startDay   : true,
                         endYear    : true,
                         endMonth   : true,
                         endDay     : true },
        startYear  : 0,
        startMonth : 0,
        startDay   : 0,
        endYear    : 0,
        endMonth   : 0,
        endDay     : 0
      },
      stateMap = {
        $container : null,
        tc    : null,  // 更新対象のクラス情報
        sk    : null   // 更新対象の出欠
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeClsTotal,
      createTable, oncalc, setNotice;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container : $container,
      $sMonthText: $container.find( '.skt-clsTotal-startMonth-textbox' ),
      $sMonth    : $container.find( '.skt-clsTotal-startMonth' ),
      $sDaytext  : $container.find( '.skt-clsTotal-startDay-textbox' ),
      $sDay      : $container.find( '.skt-clsTotal-startDay' ),
      $eMonthText: $container.find( '.skt-clsTotal-endMonth-textbox' ),
      $eMonth    : $container.find( '.skt-clsTotal-endMonth' ),
      $eDaytext  : $container.find( '.skt-clsTotal-endDay-textbox' ),
      $eDay      : $container.find( '.skt-clsTotal-endDay' ),
      $calc      : $container.find( '.skt-clsTotal-calc' ),
      $notice    : $container.find( '.skt-clsTotal-notice' ),
      $main      : $container.find( '.skt-clsTotal-main' )
    };
  }

  //---イベントハンドラ---
  oncalc = function () {
    let num, year, sYear, sMonth, eYear, eMonth;

    // ざっくりチェック。整合性までチェックしてない。
    num = jqueryMap.$sMonthText.val();
    if (isNaN(num) || num < 1 || 12 < num) {
      $.gevent.publish('invalidInput', [{errStr:'start月がおかしいです'}]);
      return false;
    }
    num = jqueryMap.$sDaytext.val();
    if (isNaN(num) || num < 1 || 31 < num) {
      $.gevent.publish('invalidInput', [{errStr:'start日がおかしいです'}]);
      return false;
    }
    num = jqueryMap.$eMonthText.val();
    if (isNaN(num) || num < 1 || 12 < num) {
      $.gevent.publish('invalidInput', [{errStr:'end月がおかしいです'}]);
      return false;
    }
    num = jqueryMap.$eDaytext.val();
    if (isNaN(num) || num < 1 || 31 < num) {
      $.gevent.publish('invalidInput', [{errStr:'end日がおかしいです'}]);
      return false;
    }

    // 当初出欠データに年を持たせてなかったが、その後持たせるように変えた。が
    // 以下の部分は変更なしでよい

    // 年度の始まった年をベースを設定
    if (configMap.startMonth == 1 || configMap.startMonth == 2 || configMap.startMonth == 3) {
      year = Number(configMap.startYear) - 1;
    } else {
      year = Number(configMap.startYear);
    }
    // 年を越していたら補正
    sMonth = Number(jqueryMap.$sMonthText.val());
    if (sMonth == 1 || sMonth == 2 || sMonth == 3) {
      sYear = year + 1;
    } else {
      sYear = year;
    }
    eMonth = Number(jqueryMap.$eMonthText.val());
    if (eMonth == 1 || eMonth == 2 || eMonth == 3) {
      eYear = year + 1;
    } else {
      eYear = year;
    }
    $.gevent.publish('reCalc', [{sy:sYear, sm:sMonth, sd:Number(jqueryMap.$sDaytext.val()),
                                 ey:eYear, em:eMonth, ed:Number(jqueryMap.$eDaytext.val())}]);
  }

  //---ユーティリティメソッド---
  createTable = function () {
    let i, str,
    num = stateMap.tc.students.length,
    f = function ( bangou ) {
      return function ( target ) {
        if (target.bangou == bangou) {
          return true;
        }
      };
    },
    header = String()
      + '<tr>'
      + '<td class="skt-talbe-header">番号</td>'
      + '<td class="skt-talbe-header">氏名</td>'
      + '<td class="skt-talbe-header">出停</td>'
      + '<td class="skt-talbe-header">病欠</td>'
      + '<td class="skt-talbe-header">事故欠</td>'
      + '<td class="skt-talbe-header">遅刻</td>'
      + '<td class="skt-talbe-header">早退</td>'
      + '<td class="skt-talbe-header">公欠</td>'
      + '<td class="skt-talbe-header">日毎の詳細</td>'
      + '</tr>';

    jqueryMap.$main.append(header);

    for (i = 0;i < num; i++) {
      let meibo = stateMap.tc.students.find(f(i+1));
      str = '<tr>';
      str += '<td>' + String((i+1)) + '</td>';
      str += '<td>' + meibo.name + '</td>';

      if ( stateMap.sk != null ) {
        let total = skt.model.skCountPerPerson((i+1), stateMap.sk, configMap.startYear,
                                                                   configMap.startMonth,
                                                                   configMap.startDay,
                                                                   configMap.endYear,
                                                                   configMap.endMonth,
                                                                   configMap.endDay);
        str += '<td>'
        if (total.syuttei   != null) { str += total.syuttei; }
        str += '</td>';
        str += '<td>'
        if (total.byouketsu != null) { str += total.byouketsu; }
        str += '</td>';
        str += '<td>'
        if (total.jikoketsu != null) { str += total.jikoketsu; }
        str += '</td>';
        str += '<td>'
        if (total.tikoku    != null) { str += total.tikoku; }
        str += '</td>';
        str += '<td>'
        if (total.soutai    != null) { str += total.soutai; }
        str += '</td>';
        str += '<td>'
        if (total.kouketsu  != null) { str += total.kouketsu; }
        str += '</td>';
        str += '<td>';
        str += total.detail;
        str += '</td>';

      } else {
        str += '<td></td><td></td><td></td><td></td><td></td><td></td><td></td>';
      }
      str += '</tr>';
      jqueryMap.$main.append(str);
    }

  }

  setNotice = function () {
    let str;

    str = skt.model.showGakunen(stateMap.tc.gakunen);
    str += skt.model.showCls(stateMap.tc.gakunen, stateMap.tc.cls);
    str += ' 回数まとめ'

    jqueryMap.$notice.html(str)
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

    stateMap.tc = skt.model.getClassMeibo();
    stateMap.sk = skt.model.getSyukketsu();

    createTable();
    setNotice();

    jqueryMap.$sMonthText.val(configMap.startMonth);
    jqueryMap.$sDaytext.val(configMap.startDay);
    jqueryMap.$eMonthText.val(configMap.endMonth);
    jqueryMap.$eDaytext.val(configMap.endDay);

    jqueryMap.$calc
      .click( oncalc );

    return true;
  }

  removeClsTotal = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {
        jqueryMap.$sMonthText.remove();
        jqueryMap.$sMonth.remove();
        jqueryMap.$sDaytext.remove();
        jqueryMap.$sDay.remove();
        jqueryMap.$eMonthText.remove();
        jqueryMap.$eMonth.remove();
        jqueryMap.$eDaytext.remove();
        jqueryMap.$eDay.remove();
        jqueryMap.$calc.remove();
        jqueryMap.$notice.remove();
        jqueryMap.$main.remove();
      }
    }
    return true;
  }

  return {
    configModule   : configModule,
    initModule     : initModule,
    removeClsTotal : removeClsTotal
  };
}());
