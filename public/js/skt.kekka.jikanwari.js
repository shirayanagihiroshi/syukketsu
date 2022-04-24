/*
 * skt.kekka.jikanwarijs
 * 欠課入力部(時間割設定)モジュール
 */
skt.kekkaJikanwari = (function () {
  'use strict';

  //---モジュールスコープ変数---
  var configMap = {
        main_html : String()
          + '<div class="skt-kekka-jikanwari-headline">時間割の設定</div>'
          + '<div class="skt-kekka-jikanwari-notice"></div>'
          + '<div class="skt-kekka-jikanwari-notice2">追加対象：</div>'
          + '<select class="skt-kekka-jikanwari-jyugyou"></select>'
          + '<button class="skt-kekka-jikanwari-update">この時間割を登録する</button>'
          + '<button class="skt-kekka-jikanwari-addJyugyou">授業が足りないので追加する</button>'
//          + '<button class="skt-kekka-jikanwari-cancel">戻る</button>'
          + '<table class="skt-kekka-jikanwari-main"></table>',
        tbHeader : String()
          + '<tr>'
            + '<td rowspan="2"></td>'
            + '<td colspan="5">A週</td>'
            + '<td rowspan="2">土</td>'
            + '<td colspan="5">B週</td>'
          + '</tr>'
          + '<tr>'
            + '<td>月</td>'
            + '<td>火</td>'
            + '<td>水</td>'
            + '<td>木</td>'
            + '<td>金</td>'
            + '<td>月</td>'
            + '<td>火</td>'
            + '<td>水</td>'
            + '<td>木</td>'
            + '<td>金</td>'
          + '</tr>',
        tbEditClsName : String()
          + '<td class="skt-kekka-jikanwari-edi">',
        noticeStr1 : String()
          + '空きコマをクリックすると、',
        noticeStr2 : String()
          + 'を追加できる。授業があるコマをクリックすると削除できる。',
        noticeStr3 : String()
          + 'まだ授業がないので、まずは画面下のボタンから授業を追加してください。'
      },
      stateMap = {
        $container     : null,
        jikanwariEdit  : []   // ユーザ操作で変更した時間割。
                              // DBから取ったままのものはmodelが持っていて
                              // getJikanwari で取れるが、そちらは直接は変更しない。
                              // コピーして保持するこっちを編集する。
      },
      jqueryMap = {},
      setJqueryMap, configModule, initModule, removeKekkaJikanwari,
      update, onUpdate, onAddJyugyou, onCancel, createTable,
      setJyugyou, onTalbeClick, copyJikanwari, editedJikanwari,
      setNotice;

  //---DOMメソッド---
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container    : $container,
      $headline     : $container.find( '.skt-kekka-jikanwari-headline' ),
      $notice       : $container.find( '.skt-kekka-jikanwari-notice' ),
      $notice2      : $container.find( '.skt-kekka-jikanwari-notice2' ),
      $jyugyou      : $container.find( '.skt-kekka-jikanwari-jyugyou' ),
      $update       : $container.find( '.skt-kekka-jikanwari-update' ),
      $addJyugyou   : $container.find( '.skt-kekka-jikanwari-addJyugyou' ),
//      $cancel       : $container.find( '.skt-kekka-jikanwari-cancel' ),
      $main         : $container.find( '.skt-kekka-jikanwari-main' )
    };
  }

  //---イベントハンドラ---
  onUpdate = function () {

    if (editedJikanwari()) {
      // 登録処理へ
      $.gevent.publish('verifyJKWUpdate', [{errStr:'時間割を登録しますか？'}]);

    } else {
      // 編集されていなければ何もしない。
    }
  }

  onAddJyugyou = function () {
    // 学年クラスはメンドイから固定で持っとくけど、
    // 合同名簿IDは真面目にDBから取ってきて選択させる。
    skt.model.readyMeiboIdList();
  }

  onCancel = function () {
    $.gevent.publish('kekka', [{}]);
  }

  //---ユーティリティメソッド---
  createTable = function () {
    let i, j, str, koma, jyugyou,
      jyugyous  = skt.model.getJyugyou(),
      jikanwari = stateMap.jikanwariEdit;

    str = configMap.tbHeader;

    for (i =1; i < 8; i++) { // 日付と1時間目から7時間目まで
      str += '<tr>';

      for (j =0; j < 12; j++) { // A週 月曜から金曜 ここはjと曜日が一致
                                // 土曜 ここもjと曜日が一致
                                // B週 月曜から金曜 ここはj-6が曜日と一致。
                                // 一番左は〇時間目だけど月曜始まりだからずれない。
        if (j == 0) {
          str += '<td>' + String(i) + '</td>'; // i時間目
        // A週 と 土曜
        } else if (j <= 6) {

          // 土曜は4限までとする。
          if ( (j == 6) && (i >= 5) ) {
            str += '<td>'
          } else {
            str += configMap.tbEditClsName;
          }

          koma = jikanwari.find(skt.util.komaSelectf('A', j, i));
          if (koma != null) {
            // 授業IDから名前を検索
            jyugyou = jyugyous.find(skt.util.jyugyouSelectf(koma.jyugyouId));
            if (jyugyou != null) {
              str += jyugyou.name;
            } else {
              str += '?';
            }
          }

          str += '</td>';

        // B曜
        } else {
          str += configMap.tbEditClsName;

          koma = jikanwari.find(skt.util.komaSelectf('B', j-6, i));
          if (koma != null) {
            jyugyou = jyugyous.find(skt.util.jyugyouSelectf(koma.jyugyouId));
            if (jyugyou != null) {
              str += jyugyou.name;
            } else {
              str += '?';
            }
          }

          str += '</td>';
        }
      }

      str += '</tr>';
    }
    jqueryMap.$main.append(str);
  }

  setJyugyou = function () {
    let jyugyous = skt.model.getJyugyou();

    if (jyugyous != null && jyugyous.length != 0) {
      jyugyous.forEach( function(item, i) {
        jqueryMap.$jyugyou.append($('<option>').html(item.name).val(item.jyugyouId));
      });
    }
  }

  onTalbeClick = function (nikka, youbi, koma) {
    let jg, km;

    // console.log('nikka:' + nikka + ' youbi:' + String(youbi) + ' koma:' + String(koma));

    // findは要素を返すが、findIndexは配列の位置を返す。
    km = stateMap.jikanwariEdit.findIndex(skt.util.komaSelectf(nikka, youbi, koma));

    // クリックしたところに授業がある
    if (km != -1) {
      // リストにおける該当の位置にあるものを1つ削除
      stateMap.jikanwariEdit.splice(km, 1);

    // クリックしたところに授業がない
    } else {
      // ドロップダウンから選択中の授業(のID)を取得
      jg = jqueryMap.$jyugyou.val();

      if (jg != null) {
        stateMap.jikanwariEdit.push({'nikka'     : nikka,
                                     'youbi'     : youbi,
                                     'koma'      : koma,
                                     'jyugyouId' : jg});
      }
    }
    jqueryMap.$main.html("");
    createTable();
  }

  copyJikanwari = function (arr) {
    let i;

    // 一旦リセット
    stateMap.jikanwariEdit = [];

    for (i = 0; i < arr.length; i++) {
      // 最近はもっとイカしたコピー方法があるらしい
      stateMap.jikanwariEdit.push({'nikka'     : arr[i].nikka,
                                   'youbi'     : arr[i].youbi,
                                   'koma'      : arr[i].koma,
                                   'jyugyouId' : arr[i].jyugyouId});
    }
  }

  // 編集前の時間割と編集後の時間割が同じかどうかチェック
  // 戻り値 true : 変更あり
  //       false : 変更なし
  editedJikanwari = function () {
    let i, target, before = skt.model.getJikanwari(),
      after = stateMap.jikanwariEdit,
      f  = function (nikka, youbi, koma, jyugyouId) {
        return function (target) {
          if (target.nikka == nikka && target.youbi == youbi && target.koma == koma && target.jyugyouId == jyugyouId) {
            return true;
          }
        }
      }

    if (before != null && after != null) {
      if (before.length == after.length) {
        for(i = 0; i < before.length; i++) {
          target = after.findIndex(f(before[i].nikka, before[i].youbi, before[i].koma, before[i].jyugyouId));
          if (target == -1) {
            return true;
          }
        }
        // リストの数が同じで、編集後から編集前を1つずつ探しても、対応がつくので同じ
        return false;

      // 数が違えばリストとして違う
      } else {
        return true;
      }

    // 編集前も編集後もなければ、一応変更なしとする
    } else if (before == null && after == null)  {
      return false;

    // どちらかがあってどちらかがなければ、変更あり
    } else {
      return true;
    }
  }

  setNotice = function () {
    let jyugyou,
      str       = "",
      jyugyous  = skt.model.getJyugyou(),
      jyugyouId = jqueryMap.$jyugyou.val();

    if (jyugyous.length != 0) {
      // 授業IDから名前を検索
      jyugyou = jyugyous.find(skt.util.jyugyouSelectf(jyugyouId));

      str += configMap.noticeStr1;
      str += '「' + jyugyou.name + '」';
      str += configMap.noticeStr2;
    } else {
      str += configMap.noticeStr3;
    }

    jqueryMap.$notice.html( str );
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

    copyJikanwari(skt.model.getJikanwari()); // 時間割をコピーしたものを使うので、createTableより先にする
    createTable();
    setJyugyou();
    setNotice();

    // 重複して登録すると、何度もイベントが発行される。それを避けるため、一旦削除
    $(document).off('click');

    $(document).on('click', '.skt-kekka-jikanwari-edi', function (event) {
      let yokoIndex = this.cellIndex, // いちばん左は「○時間め」で、0始まりだから1から
        tateIndex = $(this).closest('tr').index(); // ヘッダが２行で、0始まりだから2から

        if (yokoIndex <= 6) {
          onTalbeClick('A',yokoIndex, tateIndex-1);
        } else {
          onTalbeClick('B',yokoIndex-6, tateIndex-1);
        }
    });

    jqueryMap.$jyugyou.change( function () {
      setNotice();
    });

    jqueryMap.$update
      .click( onUpdate );
    jqueryMap.$addJyugyou
      .click( onAddJyugyou );
//    jqueryMap.$cancel
//      .click( onCancel );

    return true;
  }

  removeKekkaJikanwari = function ( ) {
    //初期化と状態の解除
    if ( jqueryMap != null ) {
      if ( jqueryMap.$container ) {
        jqueryMap.$headline.remove();
        jqueryMap.$notice.remove();
        jqueryMap.$notice2.remove();
        jqueryMap.$jyugyou.remove();
        jqueryMap.$update.remove();
        jqueryMap.$addJyugyou.remove();
//        jqueryMap.$cancel.remove();
        jqueryMap.$main.remove();
      }
    }
    return true;
  }

  update = function () {
    skt.model.updateJikanwari(stateMap.jikanwariEdit);
  }

  return {
    configModule  : configModule,
    initModule    : initModule,
    removeKekkaJikanwari   : removeKekkaJikanwari,
    update        : update
  };
}());
