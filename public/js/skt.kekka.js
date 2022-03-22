/*
 * skt.kekka.js
 * 欠課入力部モジュール
 */
skt.kekka = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<button class="skt-kekka-previousWeek">前の週</button>'
          + '<button class="skt-kekka-back">今週へ戻る</button>'
          + '<button class="skt-kekka-nextWeek">次の週</button>'
          + '<div class="skt-kekka-notice"></div>'
          + '<div class="skt-kekka-notice2">追加対象：</div>'
          + '<select class="skt-kekka-jyugyou"></select>'
          + '<table class="skt-kekka-main"></table>'
          + '<button class="skt-kekka-toJikanwari">時間割の設定へ</button>'
          + '<label for="skt-kekka-mode" class="skt-kekka-mode-toggle">'
            + '<input type="checkbox" id="skt-kekka-mode" >'
            + '<div class="skt-toggle-base"></div>'
            + '<div class="skt-toggle-circle"></div>'
            + '<div class="skt-kekka-mode-title"></div>'
          + '</label>'
          + '<div class="skt-kekka-hanrei">凡例：'
          +     '<span class="skt-kekka-yet">授業名</span>：実施済だが欠課を未入力の授業、'
          +     '<span class="skt-kekka-done">授業名</span>：欠課を入力済の授業、'
          +     '<span class="skt-kekka-today">　　</span>：今日</div>',
        tbEditClsName : String()
          + '<td class="skt-kekka-edi">',
        tbYetClsName : String()
          + '<td class="skt-kekka-edi skt-kekka-yet">',
        tbDoneClsName : String()
          + '<td class="skt-kekka-edi skt-kekka-done">',
        tbTodayClsName : String()
          + '<td class="skt-kekka-today">',
        tbTodayEdiClsName : String()
          + '<td class="skt-kekka-edi skt-kekka-today">',
        settable_map : { targetYear : true,
                         targetMonth : true,
                         targetDay   : true,
                         mode        : true},
        targetYear  : 0,
        targetMonth : 0,
        targetDay   : 0,
        mode           : "",     // 'normal' or 'edit'
        toggleColorOn  : 'red',  // cssを変えることで色を変えているので値を持っておかないとだめ
        toggleColorOff : 'gray',
        toggleMoveTime : 200    // トグルスイッチの移動に要する時間。ミリ秒
      },
      stateMap = {
        $container : null,
        cl         : null,  // カレンダー情報 ログイン時に取ってあるはず
        weeks      : [],    // 何度も取得するのメンドイので、最初に取っておく。
        nikka      : "",    // 何度も取得するのメンドイので、最初に取っておく。
        kekka      : {},    // 欠課データ
        deleteTarget: {}    // 削除対象(ダイアログで確認してから消すが
                            // 授業あり -> 理由のメモ　-> 削除 と段階をへる)
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeKekka,
      onDelete, onDeleteReal, onPrevious, onBack, onNext, onToggle,
      onJikanwari, createTable, createTableInner, viewInit,
      onTalbeClick, setJyugyou;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container    : $container,
      $previousWeek : $container.find( '.skt-kekka-previousWeek' ),
      $back         : $container.find( '.skt-kekka-back' ),
      $nextWeek     : $container.find( '.skt-kekka-nextWeek' ),
      $notice       : $container.find( '.skt-kekka-notice' ),
      $notice2      : $container.find( '.skt-kekka-notice2' ),
      $jyugyou      : $container.find( '.skt-kekka-jyugyou' ),
      $main         : $container.find( '.skt-kekka-main' ),
      $toJikanwari  : $container.find( '.skt-kekka-toJikanwari' ),
      $toggleLabel  : $container.find( '.skt-kekka-mode-toggle' ),
      $toggleTitle  : $container.find( '.skt-kekka-mode-title' ),
      $toggleCircle : $container.find( '.skt-toggle-circle' ),
      $toggle       : $container.find( '#skt-kekka-mode' ),
      $hanrei       : $container.find( '.skt-kekka-hanrei' )
    };
  }

  //---イベントハンドラ---
  onPrevious = function () {
    let day = new Date(configMap.targetYear, configMap.targetMonth - 1, configMap.targetDay), obj;

    day.setDate(day.getDate() - (1*7));

    obj = { year  : day.getFullYear(),
            month : day.getMonth() + 1, //月だけ0始まり
            day   : day.getDate(),
            mode  : configMap.mode };
    $.gevent.publish('kekka', [obj]);
  }

  onBack = function () {
    let day = new Date(), obj;

    obj = { year  : day.getFullYear(),
            month : day.getMonth() + 1, //月だけ0始まり
            day   : day.getDate(),
            mode  : configMap.mode };
    $.gevent.publish('kekka', [obj]);
  }

  onNext = function () {
    let day = new Date(configMap.targetYear, configMap.targetMonth - 1, configMap.targetDay), obj;

    day.setDate(day.getDate() + (1*7));

    obj = { year  : day.getFullYear(),
            month : day.getMonth() + 1, //月だけ0始まり
            day   : day.getDate(),
            mode  : configMap.mode };
    $.gevent.publish('kekka', [obj]);
  }

  onJikanwari = function () {
    // 時間割の設定へ
    $.gevent.publish('setJikanwari', []);
  }

  onToggle = function () {
    let mode = jqueryMap.$toggle.prop('checked'),
      obj = { year  : configMap.targetYear,
              month : configMap.targetMonth,
              day   : configMap.targetDay,
              mode  : "" };

    // 授業変更モードなら
    if ( mode == true ) {
      obj.mode = 'edit';

    // 通常モードなら
    } else {
      obj.mode = 'normal';
    }

    $.gevent.publish('kekka', [obj]);
  }

  onTalbeClick = function (year, month, day, youbi, koma) {
    // 営業日でない日はクリックイベントを設定していないから、クリックされない。
    // つまり、イベントが飛んできてるのは営業日
    let jyugyou,
      kekkaThisKoma = stateMap.kekka.find(skt.util.komaSelectFromDayf(year, month, day, koma)),
      youbiStr = ['日','月','火','水','木','金','土'],
      delTarget = String(month) + '/' + String(day) + '(' + youbiStr[youbi] + ')' + String(koma) + '限',
      jyugyous = skt.model.getJyugyou();

    // 授業なしとしてあるときは授業変更の理由が表示されている
    if (kekkaThisKoma != null && kekkaThisKoma.state == 'none') {
      // 通常モードなら何もしない
      if (configMap.mode == 'normal') {

      // 授業変更モードなら、確認画面を出して、理由メモ削除する。
      } else if (configMap.mode == 'edit') {
        stateMap.deleteTarget.year  = year;
        stateMap.deleteTarget.month = month;
        stateMap.deleteTarget.day   = day;
        stateMap.deleteTarget.koma  = koma;
        $.gevent.publish('verifyJGYDelete', [{}]);
      }

    // 授業ありとしてあるとき
    } else if (kekkaThisKoma != null && ( kekkaThisKoma.state == 'yet' || kekkaThisKoma.state == 'done') ) {

      // 通常モードなら入力画面へ遷移
      if (configMap.mode == 'normal') {
        let obj = { year  : year,
                    month : month,
                    day   : day,
                    koma  : koma,
                    jyugyouId : kekkaThisKoma.jyugyouId,
                    mode  : 'normal' };
        $.gevent.publish('kekkaInput', [obj]);
      // 授業変更モードなら、削除確認画面へ遷移
      } else if (configMap.mode == 'edit') {
        stateMap.deleteTarget.year      = year;
        stateMap.deleteTarget.month     = month;
        stateMap.deleteTarget.day       = day;
        stateMap.deleteTarget.koma      = koma;
        stateMap.deleteTarget.jyugyouId = kekkaThisKoma.jyugyouId;
        stateMap.deleteTarget.state     = 'none';
        stateMap.deleteTarget.contents  = [];

        jyugyou = jyugyous.find(skt.util.jyugyouSelectf(kekkaThisKoma.jyugyouId));

        $.gevent.publish('kekkaReason', [{ detailStr : delTarget + jyugyou.name}]);
      }

    } else {
      let jikanwari = skt.model.getJikanwari(),
        jyugyouOfJikanwari = jikanwari.find(skt.util.komaSelectf(stateMap.nikka,
                                                                 youbi,
                                                                 koma));
      // 授業の変更等がなく、時間割上で授業あれば、クリックしたところには
      // 授業名が表示されているはず
      if (jyugyouOfJikanwari != null) {
        // 通常モードなら入力画面へ遷移
        if (configMap.mode == 'normal') {
          let obj = { year  : year,
                      month : month,
                      day   : day,
                      koma  : koma,
                      jyugyouId : jyugyouOfJikanwari.jyugyouId,
                      mode  : 'normal' };
          $.gevent.publish('kekkaInput', [obj]);
        // 授業変更モードなら、削除確認画面へ遷移
        } else if (configMap.mode == 'edit') {
          stateMap.deleteTarget.year      = year;
          stateMap.deleteTarget.month     = month;
          stateMap.deleteTarget.day       = day;
          stateMap.deleteTarget.koma      = koma;
          stateMap.deleteTarget.jyugyouId = jyugyouOfJikanwari.jyugyouId;
          stateMap.deleteTarget.state     = 'none';
          stateMap.deleteTarget.contents  = [];

          jyugyou = jyugyous.find(skt.util.jyugyouSelectf(jyugyouOfJikanwari.jyugyouId));

          $.gevent.publish('kekkaReason', [{ detailStr : delTarget + jyugyou.name }]);
        }

      // 時間割上で授業なければ
      } else {
        // 通常モードなら何もしない
        if (configMap.mode == 'normal') {

        // 授業変更モードなら、授業あり（未登録）にする。
        } else if (configMap.mode == 'edit') {
          skt.model.updateKekka(year, month, day, koma, Number(jqueryMap.$jyugyou.val()), 'yet', []);
        }
      }
    }
  }

  //---ユーティリティメソッド---
  createTable = function () {
    let i, j, str,
      youbi = ['日','月','火','水','木','金','土'],
      today = new Date();

    for (i =0; i < 8; i++) { // 日付と1時間目から7時間目まで
      str = '<tr>';

      for (j =0; j < 8; j++) { // 日曜から土曜まで
                               // 一番左は空いてるのでずれるよ。
        // 最初の行は日付
        if (i == 0) {
          if (j == 0) {
            str += '<td></td>';
          } else {
            if ( (stateMap.weeks[j-1].year  == today.getFullYear()) &&
                 (stateMap.weeks[j-1].month == (today.getMonth() + 1)) &&
                 (stateMap.weeks[j-1].day   == today.getDate())) {
              str += configMap.tbTodayClsName;
            } else {
              str += '<td>';
            }
            str += String(stateMap.weeks[j-1].month) + '/';
            str += String(stateMap.weeks[j-1].day) + '(';
            str += youbi[j-1] + ')';
            str += '</td>';
          }
        } else {
          if (j == 0) {
            str += '<td>' + String(i) + '時間目</td>';
          } else {
            // ネストが深くなるので処理を分ける。
            // 年月日、日課、曜日、コマを指定して、授業を検索しテーブルに設定する
            str += createTableInner(stateMap.weeks[j-1].year,
                                    stateMap.weeks[j-1].month,
                                    stateMap.weeks[j-1].day,
                                    j-1,
                                    i,
                                    today.getFullYear(),
                                    (today.getMonth() + 1),
                                    today.getDate());
          }
        }
      }

      str += '</tr>';
      jqueryMap.$main.append(str);
    }
  }

  // 該当日、該当コマの分を検索し、表示設定する。
  // 基本的な時間割はuserコレクションに入っていて、ログイン時に取っている。
  // 欠課データはkekkaコレクションに入っている。
  // kekka コレクションのデータのstateも参照する。
  // state : none 時間割にはあるけど、授業変更などでこのタイミングの授業はない
  //       :      なぜ授業変更したのかをメモを表示する。
  //       : yet  時間割にはないけど、授業変更などでこのタイミングの授業があるが、まだ欠課データは未入力
  //       : done 時間割にあってもなくても、授業をして、欠課データを入力済
  createTableInner = function (y, m, d, youbi, koma, todayYear, todayMonth, todayDay) {
    let str = "",
      jyugyouId = -1,
      oneDay = stateMap.cl.find(skt.util.daySelectf(y, m, d)),
      kekkaState = "";

    if (oneDay != null) {
      let kekkaThisKoma = stateMap.kekka.find(skt.util.komaSelectFromDayf(y, m, d, koma));

      // 欠課を入力済ならそれを表示
      if ( kekkaThisKoma != null ) {
        jyugyouId  = kekkaThisKoma.jyugyouId;
        kekkaState = kekkaThisKoma.state;

      // そうでなければ、時間割にある授業を表示する。
      } else {
        let jikanwari = skt.model.getJikanwari(),
          jyugyouOfJikanwari = jikanwari.find(skt.util.komaSelectf(oneDay.nikka,
                                                                   youbi,
                                                                   koma));
        if (jyugyouOfJikanwari != null) {
          jyugyouId = jyugyouOfJikanwari.jyugyouId;
        }
      }

      if (jyugyouId != -1) {
        let jyugyous = skt.model.getJyugyou(),
          jyugyou = jyugyous.find(skt.util.jyugyouSelectf(jyugyouId)),
          today = new Date(),
          targetDate = new Date(y, m-1, d);

        // 単にnewすると、todayには実行日の始まりからの経過時間の分も含まれる。
        // 実施日はまだ入力してない警告(赤色)は出さないことにする。
        // targetDateは日の始まりの瞬間になっており、
        // todayを実行日の始まりの瞬間に設定して比較することにする。
        today = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        if ( ( (kekkaState == "") || (kekkaState == 'yet' ) ) &&
             (targetDate.getTime() < today.getTime()) ) {
          str += configMap.tbYetClsName; // 今日のコマはここに入り得ない
        } else if (kekkaState == 'done') {
          str += configMap.tbDoneClsName;
        } else if ( (y == todayYear) && (m == todayMonth) && (d == todayDay) ) {
          str += configMap.tbTodayEdiClsName;
        } else {
          str += configMap.tbEditClsName;
        }

        if (jyugyou != null) {
          if (kekkaState == 'none') {
            str += kekkaThisKoma.memo;
          } else {
            str += jyugyou.name;
          }
        } else {
          str += '?(ID:' + String(jyugyouId) + ')';
        }
      } else {
        if ( (y == todayYear) && (m == todayMonth) && (d == todayDay) ) {
          str += configMap.tbTodayEdiClsName;
        } else {
          str += configMap.tbEditClsName;
        }
      }

      str += '</td>';

    // 授業日でない(カレンダー登録のない)日は飛ばす
  	} else {
      str = '<td></td>';
  	}

    return str;
  }

  setJyugyou = function () {
    let jyugyous = skt.model.getJyugyou();

    if (jyugyous != null && jyugyous.length != 0) {
      jyugyous.forEach( function(item, i) {
        jqueryMap.$jyugyou.append($('<option>').html(item.name).val(item.jyugyouId));
      });
    }
  }

  viewInit = function () {
    let str,
      tLetf  = skt.util.getStyleSheetValue('.skt-toggle-circle', 'left'),
      tWidth = skt.util.getStyleSheetValue('.skt-toggle-circle', 'width'),
      // pxを除いて足して、またpxをつける
      onPos  = String (Number(tLetf.slice(0, -2)) + Number(tWidth.slice(0, -2))) + 'px';


    if ( configMap.mode == 'normal' ) {
      str = 'ただいま通常モードです。';
      if (stateMap.nikka != "") {
        str += 'この週は' + stateMap.nikka + '日課です。';
      }

      jqueryMap.$notice2.hide(); //通常モードなので隠す
      jqueryMap.$toJikanwari.hide();
      jqueryMap.$jyugyou.hide();

      jqueryMap.$toggle.prop('checked', false); // チェックボックスの設定
      jqueryMap.$toggleTitle.html('通常モード');
      jqueryMap.$toggleCircle.css({'left': tLetf});
      jqueryMap.$toggleCircle.css({'backgroundColor': configMap.toggleColorOff});

    } else if ( configMap.mode == 'edit' ) {
      str = 'ただいま授業変更モードです。授業をクリックで削除。'
      str += '空欄をクリックで授業を追加します';

      jqueryMap.$notice2.show(); //授業変更モードなので表示する。
      jqueryMap.$toJikanwari.show();
      jqueryMap.$jyugyou.show();

      jqueryMap.$toggle.prop('checked', true);  // チェックボックスの設定
      jqueryMap.$toggleTitle.html('授業変更モード');
      jqueryMap.$toggleCircle.css({'left': onPos});
      jqueryMap.$toggleCircle.css({'backgroundColor': configMap.toggleColorOn});
    }
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
    let i;

    $container.html( configMap.main_html );
    stateMap.$container = $container;
    setJqueryMap();

    setJyugyou();

    stateMap.cl = skt.model.getCalendar();
    stateMap.cl.sort(skt.util.sortCalendarf); // カレンダーは日付順に並べておく
    stateMap.weeks = skt.util.getWeek(configMap.targetYear, // 何度も使うので取っとく
                                      configMap.targetMonth-1, //月だけ0始まり
                                      configMap.targetDay);
    // 週で決まっているはずのなので、週の最初の営業日の日課を使う。
    for (i = 0; i < stateMap.weeks.length; i++) {
      let oneDay = stateMap.cl.find(skt.util.daySelectf(stateMap.weeks[i].year,
                                                        stateMap.weeks[i].month,
                                                        stateMap.weeks[i].day));
      if (oneDay != null) {
        stateMap.nikka = oneDay.nikka;
        break;
      }
    }
    stateMap.kekka = skt.model.getKekka();

    createTable();
    viewInit();

    // 重複して登録すると、何度もイベントが発行される。それを避けるため、一旦削除
    $(document).off('click');

    // 出欠または理由が選択されたらON/OFFする。
    $(document).on('click', '.skt-kekka-edi', function (event) {
      let yokoIndex = this.cellIndex, // いちばん左は「○時間め」で、0始まりだから1から
        tateIndex = $(this).closest('tr').index(); // ヘッダが1行で、0始まりだから1から

        onTalbeClick(stateMap.weeks[yokoIndex-1].year,
                     stateMap.weeks[yokoIndex-1].month,
                     stateMap.weeks[yokoIndex-1].day,
                     yokoIndex-1,
                     tateIndex);
    });

    jqueryMap.$previousWeek
      .click( onPrevious );
    jqueryMap.$back
      .click( onBack );
    jqueryMap.$nextWeek
      .click( onNext );
    jqueryMap.$toJikanwari
      .click( onJikanwari );

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

    return true;
  }

  removeKekka = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {
        jqueryMap.$previousWeek.remove();
        jqueryMap.$back.remove();
        jqueryMap.$nextWeek.remove();
        jqueryMap.$notice.remove();
        jqueryMap.$jyugyou.remove();
        jqueryMap.$main.remove();
        jqueryMap.$toJikanwari.remove();
        jqueryMap.$toggleLabel.remove(); // 親であるこれを消せば、子であるトグルスイッチは消えるはず
        jqueryMap.$hanrei.remove();
      }
    }
    return true;
  }

  onDelete = function (memo) {
    let memoStr = memo;

    if (memoStr == "") {
      memoStr = '削除済';
    }

    skt.model.updateKekka(stateMap.deleteTarget.year,
                          stateMap.deleteTarget.month,
                          stateMap.deleteTarget.day,
                          stateMap.deleteTarget.koma,
                          stateMap.deleteTarget.jyugyouId,
                          stateMap.deleteTarget.state,
                          stateMap.deleteTarget.contents,
                          memoStr);
  }

  onDeleteReal = function (memo) {
    skt.model.deleteKekka(stateMap.deleteTarget.year,
                          stateMap.deleteTarget.month,
                          stateMap.deleteTarget.day,
                          stateMap.deleteTarget.koma);
  }

  return {
    configModule  : configModule,
    initModule    : initModule,
    removeKekka   : removeKekka,
    onDelete      : onDelete,
    onDeleteReal  : onDeleteReal
  };
}());
