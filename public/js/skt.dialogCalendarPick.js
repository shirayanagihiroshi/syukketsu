/*
 * skt.dialogCalendarPick.js
 * カレンダーから日付選択モジュール
 */
skt.dialogCalendarPick = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
        + '<div class="skt-dialogCalendarPick">'
          + '<div class="skt-dialogCalendarPick-title">指定日に移動します</div>'
          + '<div class="skt-dialogCalendarPick-closer">x</div>'
          + '<button class="skt-dialogCalendarPick-previousMonth">前の月</button>'
          + '<div class="skt-dialogCalendarPick-now"></div>'
          + '<button class="skt-dialogCalendarPick-nextMonth">次の月</button>'
          + '<table class="skt-dialogCalendarPick-main"></table>'
        + '</div>',
        tbTodayClsName : String()
          + 'skt-dialogCalendarPick-today',
        tbTitleClsName : String()
          + 'skt-dialogCalendarPick-table-title',
        tbBodyClsName : String()
          + 'skt-dialogCalendarPick-table-body',
        settable_map : { targetYear : true,
                         targetMonth : true,
                         targetDay   : true},
        targetYear  : 0,
        targetMonth : 0,
        targetDay   : 0
      },
      stateMap = {
        $append_target : null,
        year           : 0, // カレンダーを表示している月
        month          : 0  // カレンダーを表示している月
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeCalendarPick,
      onPrevious, onNext, onSelect, onClose, createTable, setNow,
      makeCalendar;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $append_target = stateMap.$append_target,
        $dialog = $append_target.find( '.skt-dialogCalendarPick' );
    jqueryMap = {
      $dialog        : $dialog,
      $title         : $dialog.find( '.skt-dialogCalendarPick-title' ),
      $closer        : $dialog.find( '.skt-dialogCalendarPick-closer' ),
      $previousMonth : $dialog.find( '.skt-dialogCalendarPick-previousMonth' ),
      $now           : $dialog.find( '.skt-dialogCalendarPick-now' ),
      $nextMonth     : $dialog.find( '.skt-dialogCalendarPick-nextMonth' ),
      $main          : $dialog.find( '.skt-dialogCalendarPick-main' )
    };
  }

  //---イベントハンドラ---
  onPrevious = function () {
    let day = new Date(stateMap.year, stateMap.month -1, 1);

    day.setMonth(day.getMonth() - 1);

    stateMap.year = day.getFullYear();
    stateMap.month = day.getMonth() + 1;

    setNow();
    jqueryMap.$main.html("");
    jqueryMap.$main.html(makeCalendar(stateMap.year, stateMap.month));
  }

  onNext = function () {
    let day = new Date(stateMap.year, stateMap.month -1, 1);

    day.setMonth(day.getMonth() + 1);

    stateMap.year = day.getFullYear();
    stateMap.month = day.getMonth() + 1;

    setNow();
    jqueryMap.$main.html("");
    jqueryMap.$main.html(makeCalendar(stateMap.year, stateMap.month));
  }

  onClose = function () {
    $.gevent.publish('cancelDialog', [{}]);
    return false;
  }

  onSelect = function () {
  }

  //---ユーティリティメソッド---
  createTable = function () {

    console.log("configMap.targetYear");
    console.log(configMap.targetYear);
    console.log("configMap.targetMonth");
    console.log(configMap.targetMonth);
    console.log("configMap.targetDay");
    console.log(configMap.targetDay);

    jqueryMap.$main.html(makeCalendar(stateMap.year, stateMap.month));

  }

  setNow = function () {
    jqueryMap.$now.html(String(stateMap.year) + "年" + String(stateMap.month) + "月" )
  }

  makeCalendar = function (year, month) {
    let i, j, d, firstday,
      youbi = ['日', '月', '火', '水', '木', '金', '土'],
      str = '<tr>';

    // 曜日の部分を設定
    for (i = 0; i < 7; i++) {
      str += '<td class="' + configMap.tbTitleClsName + '">' + youbi[i] + '</td>';
    }
    str += '</tr>';
    str += '<tr>';

    // 月の始まりの日の曜日を取得
    firstday = new Date(year, month - 1, 1); //月は0始まり

    // 1日の前の分のセルを埋める
    for (i = 0; i < firstday.getDay(); i++) {
      str += '<td class="' + configMap.tbBodyClsName + '"></td>';
    }

    // 1日からカレンダーを埋めていく
    for (i = 0; i < 40; i++) { // 40に意味はない

      d = new Date(year, month - 1, 1 + i);
      // 翌月になったら終わり
      if (d.getMonth() != month - 1) {
        // 最終日の後のセルを埋める
        for (j = 0; j < 7 - d.getDay(); j++) {
          str += '<td class="' + configMap.tbBodyClsName + '"></td>';
        }
        str += '</tr>';
        break;
      // まだこの月なので作成を続ける
      } else {
        if (configMap.targetYear == year && configMap.targetMonth == month && configMap.targetDay == (1 + i)) {
          str += '<td class="' + configMap.tbTodayClsName + '">' + String(1 + i) + '</td>';
        } else {
          str += '<td class="' + configMap.tbBodyClsName + '">' + String(1 + i) + '</td>';
        }

        // 6 は土曜日でカレンダーの右端
        if (d.getDay() == 6) {
          str += '</tr>';
          str += '<tr>';
        }
      }
    }

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

  initModule = function ( $append_target ) {
    // $container.html( configMap.main_html );
    // じゃなくて、appendするパターン
    // shellでコンテナを用意すると、dialog側を消してもコンテナが残っちゃう。
    $append_target.append( configMap.main_html );
    stateMap.$append_target = $append_target;
    setJqueryMap();

    stateMap.year  = configMap.targetYear;
    stateMap.month = configMap.targetMonth;

    setNow();
    createTable();

    jqueryMap.$previousMonth
      .click( onPrevious );
    jqueryMap.$nextMonth
      .click( onNext );
    jqueryMap.$closer
      .click( onClose );
    jqueryMap.$main
      .click( onSelect );

    return true;
  }

  removeCalendarPick = function ( ) {
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

  return {
    configModule  : configModule,
    initModule    : initModule,
    removeDialog  : removeCalendarPick
  };
}());
