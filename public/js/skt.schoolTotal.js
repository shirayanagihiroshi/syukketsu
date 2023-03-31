/*
 * skt.schoolTotal.js
 * 学校単位集計モジュール
 */
skt.schoolTotal = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<button class="skt-schoolTotal-previousDay">previousDay</button>'
          + '<div class="skt-schoolTotal-today">today</div>'
          + '<button class="skt-schoolTotal-nextDay">nextDay</button>'
          + '<div class="skt-schoolTotal-title"></div>'
          + '<table class="skt-schoolTotal-main"></table>',
        del_button : 'skt-schoolTotal-del',
        tbMain2 : String()
          + '<td class="skt-schoolTotal-main2">',
        settable_map : {year  : true,
                        month : true,
                        day   : true},
        allMeibo : {},
        year  : 0,
        month : 0,
        day   : 0
      },
      stateMap = {
        $container : null,
        cl    : null,  // カレンダー情報 ログイン時に取ってあるはず
        sk    : null,  // 更新対象の出欠
        rn    : null,  // 事務からの連絡 いずれも、ここでは本日分
        delTarget : {}
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeSchoolTotal,
      createTable, setDayButtons, onPrevious, onNext, deleleRenraku;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container : $container,
      $previousDay : $container.find( '.skt-schoolTotal-previousDay' ),
      $today       : $container.find( '.skt-schoolTotal-today' ),
      $nextDay     : $container.find( '.skt-schoolTotal-nextDay' ),
      $title     : $container.find( '.skt-schoolTotal-title' ),
      $main      : $container.find( '.skt-schoolTotal-main' )
    };
  }

  //---イベントハンドラ---
  // 担任の入力の方の前日翌日と処理の流れがちょっと違う。
  // 入力のときはクラスの出欠情報を全部持っているが
  // 集計のときは、日ごとに出欠情報を取得するため。
  onPrevious = function () {
    let d = skt.util.getPreviousBusinessDay(configMap.year,
                                            configMap.month,
                                            configMap.day,
                                            stateMap.cl);
    $.gevent.publish('schoolTotalDayChange', [d]);
  }

  onNext = function () {
    let d = skt.util.getNextBusinessDay(configMap.year,
                                        configMap.month,
                                        configMap.day,
                                        stateMap.cl);
    $.gevent.publish('schoolTotalDayChange', [d]);
  }

  //---ユーティリティメソッド---
  createTable = function () {
    let i, str,
    num = configMap.allMeibo.length,
    comparef = function ( a, b ) {
      if ( (a.gakunen < b.gakunen) ||
           ((a.gakunen == b.gakunen) && (a.cls < b.cls)) ) {
        return -1;
      }
      if ( (a.gakunen > b.gakunen) ||
           ((a.gakunen == b.gakunen) && (a.cls > b.cls)) ) {
        return 1;
      }
      if ( (a.gakunen == b.gakunen) && (a.cls == b.cls) ) {
        return 0;
      }
    },
    selectf = function ( gakunen, cls ) {
      return function ( target ) {
        if ((target.gakunen == gakunen) && (target.cls == cls)) {
          return true;
        }
      };
    },
    shimashimaTab = function (i, tabA, tabB) {
      if (i % 2 == 0) {
        return tabA;
      } else {
        return tabB
      }
    },
    header = String()
      + '<tr>'
      + '<td>学年</td>'
      + '<td>クラス</td>'
      + '<td>担任入力</td>'
      + '<td>事務連絡</td>'
      + '</tr>';

    configMap.allMeibo.sort(comparef);

    jqueryMap.$main.append(header);

    for (i = 0;i < num; i++) {

      str = '<tr>';
      str += shimashimaTab(i, '<td>', configMap.tbMain2 );
      str += skt.model.showGakunen(configMap.allMeibo[i].gakunen);
      str += '</td>';
      str += shimashimaTab(i, '<td>', configMap.tbMain2 );
      str += skt.model.showCls(configMap.allMeibo[i].gakunen,
                               configMap.allMeibo[i].cls);
      str += '</td>';
      str += shimashimaTab(i, '<td>', configMap.tbMain2 );

      if (stateMap.sk != null) {
        let oneCls = stateMap.sk.find(selectf(configMap.allMeibo[i].gakunen,
                                              configMap.allMeibo[i].cls));
        if (oneCls != null) {
          str += skt.model.skCountPerCls(oneCls.member, true);
        } else {
          str += '未';
        }

      }
      str += '</td>';
      str += shimashimaTab(i, '<td>', configMap.tbMain2 );

      if (stateMap.rn != null) {
        let oneCls = stateMap.rn.filter(selectf(configMap.allMeibo[i].gakunen,
                                                configMap.allMeibo[i].cls));
        if (oneCls != null) {
          str += skt.model.skCountPerCls(oneCls, false, configMap.del_button);
        } else {
          str += '';
        }
      }
      str += '</td>';
      str += '</tr>';
      jqueryMap.$main.append(str);
    }
  }

  // stateMapに保持してある日付を元に、前日、本日、翌日のボタンの表示を設定
  setDayButtons = function () {
    let previousDay = skt.util.getPreviousBusinessDay(configMap.year,
                                                      configMap.month,
                                                      configMap.day,
                                                      stateMap.cl),
        nextDay = skt.util.getNextBusinessDay(configMap.year,
                                              configMap.month,
                                              configMap.day,
                                              stateMap.cl);
    // 本日
    jqueryMap.$today.html(skt.util.makeDateStr(configMap.year,
                                               configMap.month - 1, //月だけ0始まり
                                               configMap.day) + 'の集計');
    // 前日
    jqueryMap.$previousDay.html(skt.util.makeDateStr(previousDay.year,
                                                     previousDay.month - 1, //月だけ0始まり
                                                     previousDay.day) + 'へ');
    // 翌日
    jqueryMap.$nextDay.html(skt.util.makeDateStr(nextDay.year,
                                                 nextDay.month - 1, //月だけ0始まり
                                                 nextDay.day) + 'へ');
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

    stateMap.cl = skt.model.getCalendar();
    stateMap.cl.sort(skt.util.sortCalendarf); // カレンダーは日付順に並べておく
    stateMap.sk = skt.model.getSyukketsu();
    stateMap.rn = skt.model.getRenraku();

    setDayButtons();
    createTable();

    // 重複して登録すると、何度もイベントが発行される。それを避けるため、一旦削除
    $(document).off('click');

    // 事務連絡削除ボタンの登録
    $(document).on('click', ('.' + configMap.del_button), function (event) {
      var f = function ( gakunen, cls, bangou, year, month, day ) {
            return function ( target ) {
              if (target.gakunen == gakunen && target.cls   == cls   &&
                  target.bangou  == bangou  && target.year  == year  &&
                  target.month   == month   && target.day   == day) {
                return true;
              }
            };
          },
          p;

      stateMap.delTarget = skt.model.renrakuId2Obj(this.id);

      p = stateMap.rn.find( f(stateMap.delTarget.gakunen,
                              stateMap.delTarget.cls,
                              stateMap.delTarget.bangou,
                              stateMap.delTarget.year,
                              stateMap.delTarget.month,
                              stateMap.delTarget.day) );

      $.gevent.publish('delRenraku', [{ name: p.name }]);
    });

    jqueryMap.$previousDay
      .click( onPrevious );
    jqueryMap.$nextDay
      .click( onNext );

    return true;
  }

  removeSchoolTotal = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {
        jqueryMap.$title.remove();
        jqueryMap.$previousDay.remove();
        jqueryMap.$today.remove();
        jqueryMap.$nextDay.remove();
        jqueryMap.$main.remove();
      }
    }
    return true;
  }

  deleleRenraku = function () {
    if (!skt.util.isEmpty(stateMap.delTarget)) {
        skt.model.deleteRenraku(stateMap.delTarget);
    }
  }

  return {
    configModule      : configModule,
    initModule        : initModule,
    removeSchoolTotal : removeSchoolTotal,
    deleleRenraku     : deleleRenraku
  };
}());
