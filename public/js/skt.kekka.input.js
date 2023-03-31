/*
 * skt.kekka.input
 * 欠課入力部(入力画面)モジュール
 */
skt.kekkaInput = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<button class="skt-kekka-input-previouskoma">前の授業へ</button>'
          + '<button class="skt-kekka-input-nextkoma">次の授業へ</button>'
          + '<div class="skt-kekka-input-notice"></div>'
          + '<table class="skt-kekka-input-main"></table>'
          + '<button class="skt-kekka-input-back">一覧に戻る</button>'
          + '<button class="skt-kekka-input-update">登録</button>'
          + '<label for="skt-kekka-input-mode" class="skt-kekka-input-mode-toggle">'
            + '<input type="checkbox" id="skt-kekka-input-mode" >'
            + '<div class="skt-toggle-base"></div>'
            + '<div class="skt-toggle-circle"></div>'
            + '<div class="skt-kekka-input-mode-title"></div>'
          + '</label>',
        tbPreviousButton : String()
          + '<button class="skt-kekka-input-previousjyugyo"><<</button>',
        tbNextButton : String()
          + '<button class="skt-kekka-input-nextjyugyo">>></button>',
        tbDetailButton : String()
            + '<button class="skt-kekka-input-detail">表示</button>',
        tbEditClsName : String()
          + '"skt-kekka-input-edi"',  // ダブルコーテーションがついてるのはわざと
        tbYetClsName : String()
          + 'skt-kekka-input-yet',
        tbDoneClsName : String()
          + 'skt-kekka-input-done',
        tbTodayClsName : String()
          + 'skt-kekka-input-today',
        tbToInputMemoClsName : String()
          + '"skt-kekka-input-memoInput"',
        tbToDelMemolClsName : String()
          + '"skt-kekka-input-memoDelete"',
        tbMemoClsName : String()
          + '"skt-kekka-input-memo"',
        tbMinWidthClsName : String()
          + 'skt-kekka-input-min-width',
        limitOver80ClsName : String()
          + '"skt-kekka-input-limit-over80"',
        limitOver100ClsName : String()
          + '"skt-kekka-input-limit-over100"',
        settable_map : { targetYear : true,
                         targetMonth : true,
                         targetDay   : true,
                         koma        : true,
                         jyugyouId   : true,
                         mode        : true},
        targetYear  : 0,
        targetMonth : 0,
        targetDay   : 0,
        koma        : 0,
        jyugyouId   : 0,
        mode        : "",        // 'normal' or 'numOnly'
        toggleColorOn  : 'blue', // cssを変えることで色を変えているので値を持っておかないとだめ
        toggleColorOff : 'gray',
        toggleMoveTime : 200     // トグルスイッチの移動に要する時間。ミリ秒
      },
      stateMap = {
        $container   : null,
        cl           : null, // カレンダー情報 ログイン時に取ってあるはず
        kekkasZenki  : [],   // 生徒毎の欠課時数を数えるのに使う。
        kekkaskouki  : [],   // 欠課は該当教員分を全部取ってるがそれだと無駄があるので絞り込んで使う。
        skForClasses : [],   // クラス毎の出欠データ。詳細表示をする際に使う。
        detail       : null, // 詳細表示をする対象
        target       : [],   // 登録対象の欠課情報
        memos        : []    // getStudentMemo()では自分が担当しているクラスたち全部分を取ってきちゃうので
                             // この授業のクラスの分だけ絞り込んでおいて使う。
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeKekkaInput,
      verify, onUpdate, onBack, onPreviousJyugyou, onNextJyugyou,
      onPreviousKoma, onNextKoma, onToggle, createTable, createTableInner,
      viewInit, setNotice, getPrevious, getNext,
      getPreviousSameJyugyou, getNextSameJyugyou, getTabType,
      readyKekkaCount, readyDetail, readyDetailCompletion, showDetail,
      printStudentMemo, filterStudentMemo, redrawTable, showCount;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container      : $container,
      $previouskoma   : $container.find( '.skt-kekka-input-previouskoma' ),
      $nextkoma       : $container.find( '.skt-kekka-input-nextkoma' ),
      $notice         : $container.find( '.skt-kekka-input-notice' ),
      $main           : $container.find( '.skt-kekka-input-main' ),
      $back           : $container.find( '.skt-kekka-input-back' ),
      $update         : $container.find( '.skt-kekka-input-update' ),
      $toggleLabel    : $container.find( '.skt-kekka-input-mode-toggle' ),
      $toggleTitle    : $container.find( '.skt-kekka-input-mode-title' ),
      $toggleCircle   : $container.find( '.skt-toggle-circle' ),
      $toggle         : $container.find( '#skt-kekka-input-mode' )
    };
  }

  //---イベントハンドラ---
  verify = function () {
    let i, personGakunen, personCls,
      jyugyous = skt.model.getJyugyou(),
      jyugyou  = jyugyous.find(skt.util.jyugyouSelectf(configMap.jyugyouId)),
      allData  = $('.skt-kekka-input-main').find('tr'); // データを全て取得

    stateMap.target = [];

    for (i = 0; i < jyugyou.students.length; i++) {

      // テーブルのタイトルが3行あるから、+3してる
      if ( allData[i+3].children[4].textContent == '1' ) {

        // クラス単位授業
        if ( Object.keys(jyugyou).indexOf('cls') != -1 ) {
          personGakunen = jyugyou.gakunen;
          personCls     = jyugyou.cls;
        // 合同名簿の場合
        } else {
          personGakunen = jyugyou.students[i].gakunen;
          personCls     = jyugyou.students[i].cls;
        }

        stateMap.target.push({ gakunen : Number(personGakunen),
                               cls     : Number(personCls),
                               bangou  : Number(jyugyou.students[i].bangou) });
      }
    }
    $.gevent.publish('verifyKKUpdate', [{}]);
  }

  onUpdate = function () {
    skt.model.updateKekka(Number(configMap.targetYear),
                          Number(configMap.targetMonth),
                          Number(configMap.targetDay),
                          Number(configMap.koma),
                          Number(configMap.jyugyouId),
                          'done',
                          stateMap.target);
  }

  onBack = function () {
    let obj = { year  : configMap.targetYear,
                month : configMap.targetMonth,
                day   : configMap.targetDay};
    $.gevent.publish('kekka', [obj]);
  }

  onPreviousJyugyou = function () {
    let obj = getPreviousSameJyugyou(configMap.targetYear,
                                     configMap.targetMonth,
                                     configMap.targetDay,
                                     configMap.koma);
        obj.mode = configMap.mode;
    if (!(obj.jyugyouId == 0)) {
      $.gevent.publish('kekkaInput', [obj]);
    }
  }

  onNextJyugyou = function () {
    let obj = getNextSameJyugyou(configMap.targetYear,
                                 configMap.targetMonth,
                                 configMap.targetDay,
                                 configMap.koma);
        obj.mode = configMap.mode;
    if (!(obj.jyugyouId == 0)) {
      $.gevent.publish('kekkaInput', [obj]);
    }
  }

  onPreviousKoma = function () {
    let obj = getPrevious(configMap.targetYear,
                          configMap.targetMonth,
                          configMap.targetDay,
                          configMap.koma);
        obj.mode = configMap.mode;
    if (!(obj.jyugyouId == 0)) {
      $.gevent.publish('kekkaInput', [obj]);
    }
  }

  onNextKoma = function () {
    let obj = getNext(configMap.targetYear,
                      configMap.targetMonth,
                      configMap.targetDay,
                      configMap.koma);
        obj.mode = configMap.mode;
    if (!(obj.jyugyouId == 0)) {
      $.gevent.publish('kekkaInput', [obj]);
    }
  }

  onToggle = function () {
    let mode = jqueryMap.$toggle.prop('checked'),
      obj = { year  : configMap.targetYear,
              month : configMap.targetMonth,
              day   : configMap.targetDay,
              koma  : configMap.koma,
              jyugyouId : configMap.jyugyouId,
              mode  : "" };

    // 授業変更モードなら
    if ( mode == true ) {
      obj.mode = 'numOnly';

    // 通常モードなら
    } else {
      obj.mode = 'normal';
    }

    $.gevent.publish('kekkaInput', [obj]);
  }

  //---ユーティリティメソッド---

  getPreviousSameJyugyou = function (tYear, tMonth, tDay, tKoma) {
    let i, obj,
      y = tYear,
      m = tMonth,
      d = tDay,
      k = tKoma;

    for (i=0; i < 2000 ; i++) { //2000に特に意味はない
      obj = getPrevious(y, m, d, k);
      if (obj.jyugyouId == configMap.jyugyouId) {
        return obj;
      } else if ( obj.jyugyouId == 0 ) {
        return {jyugyouId : 0};
      } else {
        y = obj.year;
        m = obj.month;
        d = obj.day;
        k = obj.koma;
      }
    }
    return {jyugyouId : 0}; // ここまで来ないはず。
  }

  getPrevious = function (tYear, tMonth, tDay, tKoma) {
    let nikka, jyugyouOfJikanwari, kekka,
      endFlg = false,
      destJyugyouId = configMap.jyugyouId,
      jikanwari = skt.model.getJikanwari(),
      kekkas    = skt.model.getKekka(),
      y = tYear,
      m = tMonth,
      d = tDay,
      k = tKoma,
      tempDay = new Date (y, m-1, d), //月だけは0始まり
      week    = tempDay.getDay(),
      gotoBeforeDay = function () {
        // チェック対象を前の営業日へ
        tempDay = skt.util.getPreviousBusinessDay(y, m, d, stateMap.cl);
        if ( (tempDay.year == y) && (tempDay.month == m) && (tempDay.day == d) ) {
          endFlg = true; // 前の日が見つからないときはその日がそのまま返ってくるはず。
        }
        y = tempDay.year;
        m = tempDay.month;
        d = tempDay.day;
        nikka = tempDay.nikka;
        tempDay = new Date (y, m-1, d); //月だけは0始まり
        week    = tempDay.getDay();
        k = 7; // 7限からチェック
      }

      tempDay = stateMap.cl.find(skt.util.daySelectf(y, m, d));
      nikka   = tempDay.nikka;

    if (k == 1) {
      gotoBeforeDay();
    } else {
      k--;
    }

    getPreviousloop:
    while (!endFlg) {
      //指定のコマから1時間目までをチェック
      for ( ; 0 < k; k--) {

        kekka = kekkas.find(skt.util.komaSelectFromDayf(y, m, d, k));
        if (kekka != null && kekka.state == 'none') {
          // do nothing
        } else if ( kekka != null && (kekka.state == 'yet' || kekka.state == 'done') ) {
          // (時間割にあってもなくても)授業変更の設定があれば授業あり
          destJyugyouId = kekka.jyugyouId;
          break getPreviousloop; //発見！
        } else {
          jyugyouOfJikanwari = jikanwari.find(skt.util.komaSelectf(nikka, week, k));
          // 時間割にあればそれがターゲット
          if ( jyugyouOfJikanwari != null ) {
            destJyugyouId = jyugyouOfJikanwari.jyugyouId;
            break getPreviousloop;
          }
        }
      }
      // 前の営業日に対してチェックする
      gotoBeforeDay();
    }

    if (endFlg) {
      return {jyugyouId : 0}; // 授業が見つからないときは遷移できない。
    } else {
      return { year  : y,
               month : m,
               day   : d,
               koma  : k,
               jyugyouId : destJyugyouId };
    }
  }

  getNextSameJyugyou = function (tYear, tMonth, tDay, tKoma) {
    let i, obj,
      y = tYear,
      m = tMonth,
      d = tDay,
      k = tKoma;

    for (i=0; i < 2000 ; i++) { //2000に特に意味はない
      obj = getNext(y, m, d, k);
      if (obj.jyugyouId == configMap.jyugyouId) {
        return obj;
      } else if ( obj.jyugyouId == 0 ) {
        return {jyugyouId : 0};
      } else {
        y = obj.year;
        m = obj.month;
        d = obj.day;
        k = obj.koma;
      }
    }
    return {jyugyouId : 0}; // ここまで来ないはず。
  }

  getNext = function (tYear, tMonth, tDay, tKoma) {
    let nikka, jyugyouOfJikanwari, kekka,
      endFlg = false,
      destJyugyouId = configMap.jyugyouId,
      jikanwari = skt.model.getJikanwari(),
      kekkas    = skt.model.getKekka(),
      y = tYear,
      m = tMonth,
      d = tDay,
      k = tKoma,
      tempDay = new Date (y, m-1, d), //月だけは0始まり
      week    = tempDay.getDay(),
      gotoNextDay = function () {
        // チェック対象を前の営業日へ
        tempDay = skt.util.getNextBusinessDay(y, m, d, stateMap.cl);
        if ( (tempDay.year == y) && (tempDay.month == m) && (tempDay.day == d) ) {
          endFlg = true; // 次の日が見つからないときはその日がそのまま返ってくるはず。
        }
        y = tempDay.year;
        m = tempDay.month;
        d = tempDay.day;
        nikka = tempDay.nikka;
        tempDay = new Date (y, m-1, d); //月だけは0始まり
        week    = tempDay.getDay();
        k = 1; // 1限からチェック
      }

      tempDay = stateMap.cl.find(skt.util.daySelectf(y, m, d));
      nikka   = tempDay.nikka;

    if (k == 7) {
      gotoNextDay();
    } else {
      k++;
    }

    getNextloop:
    while (!endFlg) {
      //指定のコマから7時間目までをチェック
      for ( ; k < 8; k++) {

        kekka = kekkas.find(skt.util.komaSelectFromDayf(y, m, d, k));
        if (kekka != null && kekka.state == 'none') {
          // do nothing
        } else if ( kekka != null && (kekka.state == 'yet' || kekka.state == 'done') ) {
          // (時間割にあってもなくても)授業変更の設定があれば授業あり
          destJyugyouId = kekka.jyugyouId;
          break getNextloop; //発見！
        } else {
          jyugyouOfJikanwari = jikanwari.find(skt.util.komaSelectf(nikka, week, k));
          // 時間割にあればそれがターゲット
          if ( jyugyouOfJikanwari != null ) {
            destJyugyouId = jyugyouOfJikanwari.jyugyouId;
            break getNextloop;
          }
        }
      }
      // 次の営業日に対してチェックする
      gotoNextDay();
    }

    if (endFlg) {
      return {jyugyouId : 0}; // 授業が見つからないときは遷移できない。
    } else {
      return { year  : y,
               month : m,
               day   : d,
               koma  : k,
               jyugyouId : destJyugyouId };
    }
  }

  // 真ん中の日は欠課に加えて生徒の様子メモを表示する。このときはtrueで呼ぶ
  getTabType = function (targetKoma, targetKekka, yousu=false) {
    let retTab, targetDate,
      kekkaState = "",
      today = new Date();

    // todayを実行日の始まりの瞬間に補正。
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // 最初の授業の前や、最後の授業の後は授業はない
    // 欠課の入力は既にされているかもしれないし、まだかもしれない
    if ( targetKoma.jyugyouId != 0 ) {
      targetDate = new Date(targetKoma.year,
                            targetKoma.month-1,
                            targetKoma.day);
    }

    if ( (targetKoma.jyugyouId != 0) && (targetKekka != null) ) {
      kekkaState = targetKekka.state;
    }

    if ( ( (kekkaState == "") || (kekkaState == 'yet') ) && (targetKoma.jyugyouId != 0) && (targetDate.getTime() < today.getTime()) ) {
      retTab = '<td class=' + '"' + configMap.tbYetClsName;
    } else if (kekkaState == 'done') {
      retTab = '<td class=' + '"' + configMap.tbDoneClsName;
    } else if ( (targetKoma.jyugyouId != 0) &&
                (targetKoma.year  == today.getFullYear() ) &&
                (targetKoma.month == (today.getMonth() + 1)) &&
                (targetKoma.day   == today.getDate()) ) {
      retTab = '<td class=' + '"' + configMap.tbTodayClsName;
    } else {
      retTab = '<td';
    }

    // テーブルの幅を固定したい。
    // 2列になる場合はそれぞれで指定するので、ここでは設定しない。
    if (yousu != true) {
      // まだクラスの指定をしていなければ
      if (retTab == '<td') {
        retTab += ' class=' + '"';

      // 既にクラスの指定をしていれば
      } else {
        retTab += ' ';
      }
      retTab += configMap.tbMinWidthClsName + '"';
    } else {
      if (retTab != '<td') {
        retTab += '"';
      }
    }

    if (yousu == true && configMap.mode == 'normal') {
      retTab += ' colspan="2">'
    } else {
      retTab += '>';
    }

    return retTab;
  }

  createTable = function () {
    let i, str, kekkaPreviousKoma, kekkaNextKoma,
      previousNikka, todayNikka, nextNikka, countZenki, countKouki, countTotal,
      jyugyous = skt.model.getJyugyou(),
      jyugyou  = jyugyous.find(skt.util.jyugyouSelectf(configMap.jyugyouId)),
      kekkas   = skt.model.getKekka(),
      kekka    = kekkas.find(skt.util.komaSelectFromDayf(configMap.targetYear,
                                                         configMap.targetMonth,
                                                         configMap.targetDay,
                                                         configMap.koma)),
      previousKoma = getPreviousSameJyugyou(configMap.targetYear,
                                            configMap.targetMonth,
                                            configMap.targetDay,
                                            configMap.koma),
      nextKoma = getNextSameJyugyou(configMap.targetYear,
                                    configMap.targetMonth,
                                    configMap.targetDay,
                                    configMap.koma),
      filterState = function (state) {
        return function (target) {
          if ( target.state == state ) {
            return true;
          }
        }
      };

      if (previousKoma.jyugyouId != 0) {
        kekkaPreviousKoma = kekkas.find(skt.util.komaSelectFromDayf(previousKoma.year,
                                                                    previousKoma.month,
                                                                    previousKoma.day,
                                                                    previousKoma.koma));
        previousNikka = stateMap.cl.find(skt.util.daySelectf(previousKoma.year,
                                                             previousKoma.month,
                                                             previousKoma.day));
      }
      todayNikka = stateMap.cl.find(skt.util.daySelectf(configMap.targetYear,
                                                        configMap.targetMonth,
                                                        configMap.targetDay));
      if (nextKoma.jyugyouId != 0) {
        kekkaNextKoma = kekkas.find(skt.util.komaSelectFromDayf(nextKoma.year,
                                                                nextKoma.month,
                                                                nextKoma.day,
                                                                nextKoma.koma));
        nextNikka = stateMap.cl.find(skt.util.daySelectf(nextKoma.year,
                                                         nextKoma.month,
                                                         nextKoma.day));
      }

    // ちょっと複雑なヘッダー
    // 1行目
    str = '<tr>';
    str += '<td colspan="3" rowspan="2"></td>';
    str += getTabType(previousKoma, kekkaPreviousKoma);
    if (previousNikka != null) {
      str += previousNikka.nikka;
    } else {
      str +='-';
    }
    str += '</td>';
    str += getTabType({ year      : configMap.targetYear,
                        month     : configMap.targetMonth,
                        day       : configMap.targetDay,
                        koma      : configMap.koma,
                        jyugyouId : configMap.jyugyouId },
                      kekka,
                      true);
    str += todayNikka.nikka;
    str += '</td>';
    str += getTabType(nextKoma, kekkaNextKoma);
    if (nextNikka != null) {
      str += nextNikka.nikka;
    } else {
      str +='-';
    }
    str += '</td>';
    str += '<td colspan="3" rowspan="2">欠課数</td>';
    str += '<td rowspan="2"></td>';
    str += '</tr>';

    // 2行目
    str += '<tr>';
    str += getTabType(previousKoma, kekkaPreviousKoma);
    if (previousKoma.jyugyouId != 0) {
      str += skt.util.makeDateStr(previousKoma.year,
                                  previousKoma.month-1,  //月だけ0始まり
                                  previousKoma.day);
    } else {
      str +='-';
    }
    str += '</td>';
    str += getTabType({ year      : configMap.targetYear,
                        month     : configMap.targetMonth,
                        day       : configMap.targetDay,
                        koma      : configMap.koma,
                        jyugyouId : configMap.jyugyouId },
                      kekka,
                      true);
    str += skt.util.makeDateStr(configMap.targetYear,
                                configMap.targetMonth-1,  //月だけ0始まり
                                configMap.targetDay);
    str += '</td>';
    str += getTabType(nextKoma, kekkaNextKoma);
    if (nextKoma.jyugyouId != 0) {
      str += skt.util.makeDateStr(nextKoma.year,
                                  nextKoma.month-1,  //月だけ0始まり
                                  nextKoma.day);
    } else {
      str +='-';
    }
    str += '</td>';
    str += '</tr>';

    // 3行目
    str += '<tr>';
    str += '<td>組</td><td>番</td><td>氏名</td>';
    str += getTabType(previousKoma, kekkaPreviousKoma);
    str += configMap.tbPreviousButton + ' ';
    if (previousKoma.jyugyouId != 0) {
      str += String(previousKoma.koma) + '限';
    } else {
      str +='-';
    }
    str += '</td>';
    str += getTabType({ year      : configMap.targetYear,
                        month     : configMap.targetMonth,
                        day       : configMap.targetDay,
                        koma      : configMap.koma,
                        jyugyouId : configMap.jyugyouId },
                      kekka,
                      true);
    str += String(configMap.koma) + '限';
    str += '</td>';
    str += getTabType(nextKoma, kekkaNextKoma);
    if (nextKoma.jyugyouId != 0) {
      str += String(nextKoma.koma) + '限';
    } else {
      str +='-';
    }
    str += ' ' + configMap.tbNextButton;
    str += '</td>';
    countZenki = stateMap.kekkasZenki.filter(filterState('done'));
    str += '<td>前期(' + countZenki.length  + '回)</td>';
    countKouki = stateMap.kekkaskouki.filter(filterState('done'));
    str += '<td>後期(' + countKouki.length  + '回)</td>';
    countTotal = countZenki.length + countKouki.length;
    str += '<td>合計(' + countTotal + '回)</td>';
    str += '<td>詳細</td>';
    str += '</tr>';

    jqueryMap.$main.append(str);

    // 生徒ごとの繰り返し
    for (i = 0; i < jyugyou.students.length; i++) {
      // 長くなったので関数を分ける。
      str = createTableInner(i, jyugyou, kekkaPreviousKoma, kekka, kekkaNextKoma);
      jqueryMap.$main.append(str);
    }
  }

  createTableInner = function (idx, jyugyou, kekkaPreviousKoma, kekka, kekkaNextKoma) {
    let str, personGakunen, personCls, zenkiKekkaCount, koukikekkaCount, temp,
      inKyuugaku,
      f = skt.util.kekkaStudentSelectf,
      printKekka = function (targetKoma, gakunen, cls, bangou) {
        if ( (targetKoma != null) && (targetKoma.state == 'done')) {
          // 該当の生徒の結果があれば
          if ( targetKoma.contents.findIndex(
                 skt.util.studentSelectf(gakunen, cls, bangou)) != -1) {
            return  '1';
          }
        }
        return "";
      };

    // クラス単位授業
    if ( Object.keys(jyugyou).indexOf('cls') != -1 ) {
      personGakunen = jyugyou.gakunen;
      personCls     = jyugyou.cls;
    // 合同名簿の場合
    } else {
      personGakunen = jyugyou.students[idx].gakunen;
      personCls     = jyugyou.students[idx].cls;
    }

    str = '<tr>';
    str += '<td>';
    str += String(personCls);
    str += '</td>';
    str += '<td>';
    str += String(jyugyou.students[idx].bangou);
    str += '</td>';
    str += '<td class=' + configMap.tbToInputMemoClsName + '>';
    str += String(jyugyou.students[idx].name);
    str += '</td>';
    // 前のコマ
    str += '<td>';
    str += printKekka(kekkaPreviousKoma, personGakunen, personCls, jyugyou.students[idx].bangou);
    str += '</td>';

    // 編集対象のコマ
    inKyuugaku = skt.util.inKyuugaku(personGakunen,
                                     personCls,
                                     jyugyou.students[idx].bangou,
                                     configMap.targetYear,
                                     configMap.targetMonth,
                                     configMap.targetDay,
                                     skt.model.getKyuugaku());
    // 休学中なら入力させない
    if (inKyuugaku != "") {
      str += '<td>';
    } else {
      str += '<td class=' + configMap.tbEditClsName + '>';
    }
    str += printKekka(kekka, personGakunen, personCls, jyugyou.students[idx].bangou);
    str += '</td>';
    if (configMap.mode == 'normal') {
      // 休学中なら事由を表示
      if (inKyuugaku != "") {
        str += '<td>' + inKyuugaku + '</td>';
      } else {
        str += '<td class=' + configMap.tbMemoClsName + '>';
        str += printStudentMemo(configMap.targetYear,
                                configMap.targetMonth,
                                configMap.targetDay,
                                personGakunen,
                                personCls,
                                jyugyou.students[idx].bangou);
        str += '</td>';
      }
    }

    // 次のコマ
    str += '<td>';
    str += printKekka(kekkaNextKoma, personGakunen, personCls, jyugyou.students[idx].bangou);
    str += '</td>';

    // 前期欠課時数
    temp = stateMap.kekkasZenki.filter(f(personGakunen,
                                         personCls,
                                         jyugyou.students[idx].bangou,
                                         configMap.jyugyouId));
    zenkiKekkaCount = temp.length;
    str += '<td>' + String(zenkiKekkaCount) + '</td>';
    // 後期欠課時数
    temp = stateMap.kekkaskouki.filter(f(personGakunen,
                                         personCls,
                                         jyugyou.students[idx].bangou,
                                         configMap.jyugyouId));
    koukikekkaCount = temp.length;
    str += '<td>' + String(koukikekkaCount) + '</td>';
    // 欠課時数合計
    str += '<td>' + showCount(zenkiKekkaCount + koukikekkaCount) + '</td>';
    str += '<td>' + configMap.tbDetailButton +'</td>';
    str += '</tr>';
    return str;
  }

  setNotice = function () {
    let str = "",
      jyugyous = skt.model.getJyugyou(),
      jyugyou  = jyugyous.find(skt.util.jyugyouSelectf(configMap.jyugyouId));

    str += jyugyou.name;
    // クラス単位授業
    if ( Object.keys(jyugyou).indexOf('cls') != -1 ) {
      str += '(';
      str += skt.model.showGakunen(jyugyou.gakunen);
      str += skt.model.showCls(jyugyou.gakunen,jyugyou.cls);
      str += ')';
    // 合同名簿の場合
    } else {
    }
    str += "の欠課入力";

    if ( Object.keys(jyugyou).indexOf('tanni') != -1 ) {
      str += ' [単位数:' + String(jyugyou.tanni) + ']';
    }

    jqueryMap.$notice.html(str)
  }

  readyKekkaCount = function () {
    let kek = skt.model.getKekka(),
      f = skt.util.nengappiAndJyugyouIdSelect,
      zenkiP = skt.appVersion.getZenkiPeriod(),
      kenkiP = skt.appVersion.getKoukiPeriod();

    // 欠課データのうち該当区間にあって、該当の授業IDのものをもっておいて
    // 欠課時数を数えるのに使う。
    stateMap.kekkasZenki = kek.filter(f(zenkiP.startY,
                                        zenkiP.startM,
                                        zenkiP.startD,
                                        zenkiP.endY,
                                        zenkiP.endM,
                                        zenkiP.endD,
                                        configMap.jyugyouId));

    stateMap.kekkaskouki = kek.filter(f(kenkiP.startY,
                                        kenkiP.startM,
                                        kenkiP.startD,
                                        kenkiP.endY,
                                        kenkiP.endM,
                                        kenkiP.endD,
                                        configMap.jyugyouId));
  }

  readyDetail = function () {
    let idx = stateMap.skForClasses.findIndex(skt.util.clsSelectf(stateMap.detail.gakunen,
                                                                  stateMap.detail.cls));

    // 該当のクラスの出欠情報が取得済なら、すぐ計算して描画
    if (idx != -1) {
      showDetail();

    // 該当のクラスの出欠情報をまだ取得していなければ、取得する
    } else {
      skt.model.readySyukketsuGakunenCls('kekka',
                                         stateMap.detail.gakunen,
                                         stateMap.detail.cls);
    }
  }

  showDetail = function () {
    let i, tempIdx,
      inSyutteiCount = 0, // 欠課のうち、出席停止だった回数
      detailStr = "",
      kek = skt.model.getKekka(),
      f   = skt.util.kekkaStudentSelectf,
      // 該当生徒の結果データを絞り込む
      kekkaPerson = kek.filter(f(stateMap.detail.gakunen,
                                 stateMap.detail.cls,
                                 stateMap.detail.bangou,
                                 configMap.jyugyouId)),
      // 非同期の出欠データの取得は完了しているはず
      sks = stateMap.skForClasses.find(skt.util.clsSelectf(stateMap.detail.gakunen,
                                                           stateMap.detail.cls)),
      f2  = skt.model.syukketsuInSyutteiSelectf;

      // 欠課は日付順にしておく
      kekkaPerson.sort(skt.util.sortKekkaf);

      for (i = 0; i < kekkaPerson.length; i++) {
        tempIdx = sks.sk.findIndex(f2(kekkaPerson[i].year,
                                   kekkaPerson[i].month,
                                   kekkaPerson[i].day,
                                   stateMap.detail.gakunen,
                                   stateMap.detail.cls,
                                   stateMap.detail.bangou));
        if ( tempIdx != -1 ) {
          inSyutteiCount++;
        }
        detailStr += String(kekkaPerson[i].month) + '/' + String(kekkaPerson[i].day) + ',';
      }

    if ( detailStr != "" ) {
      detailStr= detailStr.slice(0, -1); //最後の ',' は邪魔なので削除
    }

    stateMap.detail.obj.html( '内' + String(inSyutteiCount) + '回は出席停止。'
                              + '詳細：' + detailStr);

    // 次を受け付けるようにする。
    stateMap.detail = null;
  }

  printStudentMemo = function (y, m, d, g, c, b) {
    let i,
      memoStr = '<ul>';

    // 生徒の様子メモがあれば
    // (この人が担当しているクラスたちのデータが全部入ってるはず)
    if (stateMap.memos.length != 0) {
      let idx,
        f = skt.util.dayAndStudentSelectf;

      idx = stateMap.memos.findIndex(f(y, m, d, g, c, b));
      // 該当の日の該当の生徒のデータがあれば
      if (idx != -1) {
        for (i = 0; i < stateMap.memos[idx].contents.length; i++) {
          // 自分で書いたメモなら
          if (skt.model.isMyMemo(stateMap.memos[idx].contents[i]) == true) {
            memoStr += '<li class=' + configMap.tbToDelMemolClsName + '>';

          // 他の人が書いたメモなら
          } else {
            memoStr += '<li>';

          }
          memoStr += stateMap.memos[idx].contents[i].memo;
          memoStr += '</li>'
        }
      }
    }
    memoStr += '</ul>'
    return memoStr;
  }

  // getStudentMemo()で自分が担当しているすべてのクラスの生徒の様子メモを取ってくる
  // 毎回すべてを探すと無駄なので、このクラス分だけに絞り込んで使う
  // クラス混合のときはもっと絞り込めるだろうが、やってない
  filterStudentMemo = function () {
    let i, templist, gakunenClsList = [],
      myAllMemos = skt.model.getStudentMemo(),
      jyugyous = skt.model.getJyugyou(),
      jyugyou  = jyugyous.find(skt.util.jyugyouSelectf(configMap.jyugyouId)),
      f = skt.util.clsSelectf;

    // 初期化しないと追記で増えるね
    stateMap.memos = [];

    // 学年と組で指定なら
    if (Object.keys(jyugyou).indexOf('gakunen') != -1) {
      stateMap.memos = myAllMemos.filter(f(jyugyou.gakunen, jyugyou.cls));

    // クラス混合なら
    } else {

      for (i = 0; i < jyugyou.students.length; i++) {
        // メンドイので人単位でなくクラス単位で絞る
        if (gakunenClsList.findIndex(f(jyugyou.students[i].gakunen, jyugyou.students[i].cls)) == -1) {
          gakunenClsList.push({ gakunen : jyugyou.students[i].gakunen,
                                cls     : jyugyou.students[i].cls });
        }
      }

      for (i = 0; i < gakunenClsList.length; i++) {
        templist = myAllMemos.filter(f(gakunenClsList[i].gakunen, gakunenClsList[i].cls));
        if (templist.length != 0) {
          stateMap.memos = stateMap.memos.concat(templist);
        }
      }
    }
  }

  viewInit = function () {
    let tLetf  = skt.util.getStyleSheetValue('.skt-toggle-circle', 'left'),
      tWidth = skt.util.getStyleSheetValue('.skt-toggle-circle', 'width'),
      // pxを除いて足して、またpxをつける
      onPos  = String (Number(tLetf.slice(0, -2)) + Number(tWidth.slice(0, -2))) + 'px';

      if ( configMap.mode == 'normal' ) {
        jqueryMap.$toggle.prop('checked', false); // チェックボックスの設定
        jqueryMap.$toggleTitle.html('通常モード');
        jqueryMap.$toggleCircle.css({'left': tLetf});
        jqueryMap.$toggleCircle.css({'backgroundColor': configMap.toggleColorOff});

      } else if ( configMap.mode == 'numOnly' ) {
        jqueryMap.$toggle.prop('checked', true);  // チェックボックスの設定
        jqueryMap.$toggleTitle.html('欠課数のみモード');
        jqueryMap.$toggleCircle.css({'left': onPos});
        jqueryMap.$toggleCircle.css({'backgroundColor': configMap.toggleColorOn});
      }
  }

  showCount = function (count) {
    let retStr = "",
      jyugyous = skt.model.getJyugyou(),
      jyugyou  = jyugyous.find(skt.util.jyugyouSelectf(configMap.jyugyouId));

    // 教務の内規より
    // 欠課時数が単位数×35の1/4以下でないとだめ。
    if (Object.keys(jyugyou).indexOf('tanni') != -1) {
      let hiNinteiCount = jyugyou.tanni * 35 * 1/4;

      // 非認定の回数を超えた
      if ( count > hiNinteiCount ) {
        retStr = '<div class=' + configMap.limitOver100ClsName + '>' + String(count) + '</div>';

      // 非認定の回数の80%に達した
      } else if ( count >= (hiNinteiCount * 8/10) ) {
        retStr = '<div class=' + configMap.limitOver80ClsName + '>' + String(count) + '</div>';

      // まだ大丈夫
      } else {
        retStr = String(count);
      }
    } else {
      retStr = String(count);
    }
    return retStr;
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

    stateMap.cl = skt.model.getCalendar();
    stateMap.cl.sort(skt.util.sortCalendarf); // カレンダーは日付順に並べておく

    stateMap.skForClasses = [];
    stateMap.detail = null;

    readyKekkaCount();
    filterStudentMemo();

    // ここにくるまでに名簿や欠課のデータはとってある。
    createTable();
    setNotice();
    viewInit();

    // 重複して登録すると、何度もイベントが発行される。それを避けるため、一旦削除
    $(document).off('click');

    // 欠課が選択されたらON/OFFする。
    $(document).on('click', '.skt-kekka-input-edi', function (event) {
      let beforeVal = $(this).html();

      if (beforeVal == '1') {
        $(this).html("");
      } else {
        $(this).html('1');
      }
    });

    // setJqueryMap() した後に追加したものは、こんな風にクリックの登録をしてる
    $(document).on('click', '.skt-kekka-input-previousjyugyo', function (event) {
      onPreviousJyugyou();
    });
    $(document).on('click', '.skt-kekka-input-nextjyugyo', function (event) {
      onNextJyugyou();
    });
    $(document).on('click', '.skt-kekka-input-detail', function (event) {
      // 出欠情報を取るのは非同期なので、返事がくるまでは次を受け付けない。
      // stateMap.detail が null       : 出欠の取得待ち中でない
      // stateMap.detail が null でない : 出欠の取得待ち中
      if ( stateMap.detail == null ) {
        let jyugyous = skt.model.getJyugyou(),
          jyugyou  = jyugyous.find(skt.util.jyugyouSelectf(configMap.jyugyouId));

        stateMap.detail = {};
        stateMap.detail.obj = $(this).parent();

        // 学年と組で指定なら
        if (Object.keys(jyugyou).indexOf('gakunen') != -1) {
          stateMap.detail.gakunen = jyugyou.gakunen;
          stateMap.detail.cls     = jyugyou.cls;
          // ヘッダが3行で0始まり。出席番号は1始まりだから-2
          stateMap.detail.bangou  = $(this).closest('tr').index() - 2;
        // 合同名簿で指定なら
        } else {
          // ヘッダが3行で0始まり。配列としては0始まりだから-3
          stateMap.detail.gakunen = jyugyou.students[$(this).closest('tr').index() - 3].gakunen;
          stateMap.detail.cls     = jyugyou.students[$(this).closest('tr').index() - 3].cls;
          stateMap.detail.bangou  = jyugyou.students[$(this).closest('tr').index() - 3].bangou;
        }
        readyDetail();
      }
    });

    // 氏名が選択されたら様子メモを入力する。
    $(document).on('click', '.skt-kekka-input-memoInput', function (event) {
      let str, personGakunen, personCls,
        jyugyous = skt.model.getJyugyou(),
        jyugyou  = jyugyous.find(skt.util.jyugyouSelectf(configMap.jyugyouId)),
        tateIndex = $(this).closest('tr').index();

      // 欠課時数のみモードのときはやらなくていいかな
      if (configMap.mode == 'numOnly') {
        return;
      }

      // クラス単位授業
      if ( Object.keys(jyugyou).indexOf('cls') != -1 ) {
        personGakunen = jyugyou.gakunen;
        personCls     = jyugyou.cls;
      // 合同名簿の場合
      } else {
        personGakunen = jyugyou.students[tateIndex-3].gakunen; //ヘッダが3行あるから-3
        personCls     = jyugyou.students[tateIndex-3].cls;
      }
      // 入力ダイアログでの表示文言
      str = String(configMap.targetMonth) + '/' + String(configMap.targetDay)
        + 'の' + skt.model.showGakunen(personGakunen)
        + skt.model.showCls(personGakunen, personCls)
        + String(jyugyou.students[tateIndex-3].bangou) + '番'
        + '　' + jyugyou.students[tateIndex-3].name;

      $.gevent.publish('studentMemo', [{ year      : Number(configMap.targetYear),
                                         month     : Number(configMap.targetMonth),
                                         day       : Number(configMap.targetDay),
                                         gakunen   : Number(personGakunen),
                                         cls       : Number(personCls),
                                         bangou    : Number(jyugyou.students[tateIndex-3].bangou),
                                         detailStr : str }]);
    });


    // 様子メモがクリックされたら、削除確認画面を出す
    $(document).on('click', '.skt-kekka-input-memoDelete', function (event) {
      let personGakunen, personCls,
        //listIndex = $(this).index(),               // リストの何個目
        //yokoIndex = $(this).closest('td').index(), // テーブルの何列目
        tateIndex = $(this).closest('tr').index(),   // テーブルの何行目
        jyugyous  = skt.model.getJyugyou(),
        jyugyou   = jyugyous.find(skt.util.jyugyouSelectf(configMap.jyugyouId));


      // クラス単位授業
      if ( Object.keys(jyugyou).indexOf('cls') != -1 ) {
        personGakunen = jyugyou.gakunen;
        personCls     = jyugyou.cls;
      // 合同名簿の場合
      } else {
        personGakunen = jyugyou.students[tateIndex-3].gakunen; //ヘッダが3行あるから-3
        personCls     = jyugyou.students[tateIndex-3].cls;
      }

      // 当初、削除対象の配列における位置を指定しようと思った。しかし
      // 'contents.2.delflg' みたいな感じでアクセスすることはできたが
      // n番目をパラメータとして扱う方法がよく分からなかった。
      // arrayFilters を使うのも配列の位置の指定がよく分からん。
      // 結局メモの内容の一致で指定することにした。
      $.gevent.publish('delStudentMemo', [{ year    : Number(configMap.targetYear),
                                            month   : Number(configMap.targetMonth),
                                            day     : Number(configMap.targetDay),
                                            gakunen : Number(personGakunen),
                                            cls     : Number(personCls),
                                            bangou  : Number(jyugyou.students[tateIndex-3].bangou),
                                            memo    : $(this).html(),
                                            showStr : $(this).html() }]);
    });

    jqueryMap.$toggle
      .click( function () {
        let moveWidth, backGroundColor,
          // configMapに持たせようとしたけど、全体の初期化のタイミングでは
          // まだcssが取れないみたいだったのであきらめてここで取得。
          toggleMoveWidth = skt.util.getStyleSheetValue('.skt-toggle-circle', 'width');

        if ( configMap.mode == 'normal' ) {
          moveWidth       = '+=' + toggleMoveWidth;
          backGroundColor = configMap.toggleColorOn;
        } else {
          moveWidth       = '-=' + toggleMoveWidth;
          backGroundColor = configMap.toggleColorOff;
        }

        // アニメーションが終わったら、onToggle()が呼ばれる。
        jqueryMap.$toggleCircle.stop().animate({
          'left': moveWidth,
          'backgroundColor': backGroundColor
        }, configMap.toggleMoveTime, function () {
          onToggle();
        });

      });

    jqueryMap.$back
      .click( onBack );
    jqueryMap.$previouskoma
      .click( onPreviousKoma );
    jqueryMap.$nextkoma
      .click( onNextKoma );
    jqueryMap.$update
      .click( verify );

    return true;
  }

  removeKekkaInput = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {
        jqueryMap.$previouskoma.remove();
        jqueryMap.$nextkoma.remove();
        jqueryMap.$notice.remove();
        jqueryMap.$main.remove();
        jqueryMap.$back.remove();
        jqueryMap.$update.remove();
        jqueryMap.$toggleLabel.remove();
      }
    }
    return true;
  }

  readyDetailCompletion = function () {
    let obj = { gakunen : stateMap.detail.gakunen,
                cls     : stateMap.detail.cls,
                sk      : skt.model.getSyukketsu()};

    stateMap.skForClasses.push(obj);

    showDetail();
  }

  // 生徒の様子メモを追加したあとの再描画用
  redrawTable = function () {
    if ( (jqueryMap != null) && (jqueryMap.$main != null) &&
         (jqueryMap.$main.filter(':visible').length != 0) ) { // 表示中なら

      filterStudentMemo();
      jqueryMap.$main.html("");
      createTable();
    }
  }

  return {
    configModule  : configModule,
    initModule    : initModule,
    removeKekkaInput : removeKekkaInput,
    update        : onUpdate,
    readyDetailCompletion : readyDetailCompletion,
    redrawTable   : redrawTable
  };
}());
