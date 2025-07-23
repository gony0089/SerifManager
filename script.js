// モーダル関連の要素を取得
const fileModalOverlay = document.getElementById('fileModalOverlay');
const fileModalCloseButton = document.getElementById('fileModalClose');
const modalTitle = document.getElementById('modalTitle');
const fileNameInput = document.getElementById('fileNameInput');
const modalActionButton = document.getElementById('modalActionButton');
const modalMessage = document.getElementById('modalMessage');

const loadModalOverlay = document.getElementById('loadModalOverlay');
const loadModalCloseButton = document.getElementById('loadModalCloseButton');
const driveFileListContainer = document.getElementById('driveFileListContainer'); 
const listViewButton = document.getElementById('listViewButton');
const gridViewButton = document.getElementById('gridViewButton');

//ローディング画面
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingStatusText = document.getElementById('loadingStatusText');

let tokenClient;
let idTokenCredential = null;
let currentFileId = null;
let gapiInitPromise =null;

//操作ボタン系
const addButton = document.getElementById('addButton');
const removeButton = document.getElementById('removeButton');
const uwagakisaveButton = document.getElementById('Uwagakisave');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton'); 
const a4Page = document.querySelector('.a4-page');
const OptionButton = document.querySelector('.options-button');


let appFolderId = null;
const APP_FOLDER_NAME = "MangaSerifManagerApp"; 
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';


//トグルスイッチ
const driveConnectSwitch = document.getElementById('driveConnectSwitch');
const driveStatusText = document.getElementById('driveStatusText');
const editingFileNameSpan = document.getElementById('editingFileName');
const togleContainer = document.querySelector('.togle-container');

//ログイン有無による読み込みボタンのと明度変更
function updateFileOperationButtons(loggedIn) {
  const loadButtonElement = loadButton.querySelector("button")
  if (loggedIn) {
    loadButtonElement.style.opacity = '1';
  } else {
    loadButtonElement.style.opacity = '0.2'; 
  }
}

//読み込みモーダル内の機能
listViewButton.addEventListener('click', () => {
    driveFileListContainer.classList.remove('view-grid');
    driveFileListContainer.classList.add('view-list');
    
    listViewButton.classList.add('active');
    gridViewButton.classList.remove('active');
});

gridViewButton.addEventListener('click', () => {
    driveFileListContainer.classList.remove('view-list');
    driveFileListContainer.classList.add('view-grid');

    gridViewButton.classList.add('active');
    listViewButton.classList.remove('active');
});

function showFileModal(){
  fileModalOverlay.style.display='flex';
}

function hidefileModal(){
  fileModalOverlay.style.display = 'none';
}
fileModalCloseButton.addEventListener('click', () => {
  hidefileModal();
});
//モーダル外のところ触っても消えるようにする
fileModalOverlay.addEventListener('mousedown',(event)=>{
  if(event.target === fileModalOverlay){
    hidefileModal();
  }
});


// 追加ボタンがクリックされた時の処理
addButton.addEventListener('click', () => {
  const verticalBlocks = a4Page.querySelectorAll('.vertical-block');
  const newBlockNumber = verticalBlocks.length + 1;
  const newVerticalBlock = document.createElement('div');
  newVerticalBlock.classList.add('vertical-block');
  newVerticalBlock.innerHTML = `
    <p>${newBlockNumber}p</p>
    <textarea class="vertical-text" placeholder="セリフを入力"></textarea>
    <textarea class="title-text" placeholder="シーンを入力"></textarea>
  `;
  a4Page.appendChild(newVerticalBlock);
});


//読み込み機能
loadButton.addEventListener('click', () => {
     const isLoggedIn = checkUserLoginStatus(); 

    // 2. もしログインしていなければ、ここで処理を完全に止める
    if (!isLoggedIn) {
        alert("ファイルを読み込むには、まずGoogleにログインしてください。");
        return; // ← returnで、これ以降の処理は実行されない
    }

    // 1. 新しいファイル一覧モーダルを表示する
    if (loadModalOverlay) {
        loadModalOverlay.style.display = 'flex';
    } else {
        console.error('ファイル一覧モーダルが見つかりません。HTMLのIDを確認してください。');
        return;
    }
    fetchAndDisplayDriveFiles(); 
});

if (loadModalCloseButton) {
    loadModalCloseButton.addEventListener('click', () => {
        loadModalOverlay.style.display = 'none';
    });
}
// 新しいモーダル外クリックで閉じる処理も同様に追加
if (loadModalOverlay) {
    loadModalOverlay.addEventListener('mousedown', (event) => {
        if (event.target === loadModalOverlay) {
            loadModalOverlay.style.display = 'none';
        }
    });
}

async function fetchAndDisplayDriveFiles() {
    driveFileListContainer.innerHTML = '<p>ファイルを読み込み中です...</p>'; // ローディング表示
    try {
      if (!gapi.client.drive || !appFolderId) { 
            console.error('Drive APIの準備ができていないか、アプリ専用フォルダIDがありません。');
            alert('ファイルの読み込みに必要な情報が不足しています。ログインや初期化を確認してください。');
            driveFileListContainer.innerHTML = '<p style="color:red;">読み込みの準備ができていません。</p>';
            return;
        }

        const response = await gapi.client.drive.files.list({
            // q: `'${appFolderId}' in parents and trashed=false and mimeType='application/json'`, // アプリ専用フォルダ内のJSONファイルのみ
            q: `'${appFolderId}' in parents and trashed=false`, // まずはアプリ専用フォルダ内のすべてのファイル
            fields: 'files(id, name, modifiedTime, iconLink)', // 取得するファイル情報 (ID, 名前, 更新日時)
            orderBy: 'modifiedTime desc' // 更新日時が新しい順で並べる
        });

        const files = response.result.files;
        driveFileListContainer.innerHTML = ''; // ローディング表示や古いリストをクリア

        if (files && files.length > 0) {
            // ファイルが見つかった場合、リストとして表示する
            const ul = document.createElement('ul');
            ul.style.listStyleType = 'none'; // リストの点を消す
            ul.style.padding = '0';
            ul.style.margin = '0';

            files.forEach(file => {
                const li = document.createElement('li');
                let highResIconLink = '';
                if (file.iconLink) {
                // URLの"/16/"の部分を、より大きな"/48/"に置き換える
                highResIconLink = file.iconLink.replace('/16/', '/128/');
           }

                 li.className = 'drive-file-item'; // CSSでスタイルを当てるための共通クラス
                // グリッド表示用に、ファイルアイコンとファイル名のコンテナを作る
                li.innerHTML = `
                      <img src="${highResIconLink}" alt="file icon" class="file-icon" onerror="this.style.display='none'">
                      <span class="file-name" title="${file.name}">${file.name}</span>
                      <span class="file-modified-time">${new Date(file.modifiedTime).toLocaleDateString()}</span>
                `;
             

                // ★★★ ファイルIDをdata属性としてHTML要素に保存しておく ★★★
                li.dataset.fileId = file.id; 
                li.dataset.fileName = file.name; // ファイル名も一緒に保存しておくと後で便利

                // ファイルアイテムがクリックされた時の処理 (次のステップで中身を読み込む)
                li.addEventListener('dblclick', () => {
                    const selectedFileId = li.dataset.fileId;
                    const selectedFileName = li.dataset.fileName;
                    
                    // モーダルを閉じる
                    if (loadModalOverlay) {
                        loadModalOverlay.style.display = 'none';
                    }
                    
                    // ★次のステップで実装する関数を呼び出す★
                    loadFileContent(selectedFileId, selectedFileName); 
                });
                ul.appendChild(li);
            });
            driveFileListContainer.appendChild(ul);

        } else {
            // ファイルが見つからなかった場合
            driveFileListContainer.innerHTML = '<p>保存されているファイルはありません。</p>';
        }

    } catch (error) {
        console.error('ファイルリストの取得または表示中にエラー:', error);
        alert('ファイルリストの取得に失敗しました。');
        driveFileListContainer.innerHTML = '<p style="color:red;">ファイルの読み込みに失敗しました。</p>';
    }
}



async function loadFileContent(fileId, fileName) {

  
    editingFileNameSpan.textContent = `『${fileName}』を読み込み中...`; 
    

    try {
      loadingStatusText.textContent = `『${fileName}』を読み込み中...`;
      loadingOverlay.style.display = 'flex';

        await new Promise(resolve => setTimeout(resolve, 1500)); 
        
        // 1. Google Drive APIを使ってファイルの中身を取得
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media' // ファイルの中身そのものを取得する指定
        });

        loadingStatusText.textContent = "読み込みが完了しました！";
        
        // response.body にJSON文字列としてファイルの中身が入っています
        const fileContentString = response.body;

        // JSON文字列をJavaScriptのオブジェクトに変換
        const loadedData = JSON.parse(fileContentString); 


        // 2. 作品タイトルを画面の入力欄に設定
        const titleInputElement = document.getElementById('titleInput');
        if (titleInputElement) {
            titleInputElement.value = loadedData.title || ''; // もしtitleがなければ空文字
        }
        
         const existingVerticalBlocks = a4Page.querySelectorAll('.vertical-block');
        existingVerticalBlocks.forEach(block => {
            block.remove(); // 各ブロックをDOMから削除
        });
        


        // 読み込んだデータに基づいて新しいページブロックを生成
        if (loadedData.pages && loadedData.pages.length > 0) {
            loadedData.pages.forEach((pageData, index) => {
                const newBlockNumber = index + 1;
                const newVerticalBlock = document.createElement('div');
                newVerticalBlock.classList.add('vertical-block');
                newVerticalBlock.innerHTML = `
                    <p>${newBlockNumber}p</p>
                    <textarea class="vertical-text" placeholder="セリフを入力…">${pageData.serif || ''}</textarea>
                    <textarea class="title-text" placeholder="シーンを入力">${pageData.scene || ''}</textarea>
                `;
                a4Page.appendChild(newVerticalBlock);
            });
        } else {
            // 読み込んだデータにページがない場合（または空のページ配列の場合）
            // 最低1つの空のブロックを表示する
            const newVerticalBlock = document.createElement('div');
            newVerticalBlock.classList.add('vertical-block');
            newVerticalBlock.innerHTML = `
                <p>1p</p>
                <textarea class="vertical-text" placeholder="セリフを入力…"></textarea>
                <textarea class="title-text" placeholder="シーンを入力"></textarea>
            `;
            a4Page.appendChild(newVerticalBlock);
        }


        // 4. 現在のファイルIDを更新
        currentFileId = fileId;
        // ブラウザのタブのタイトルも、読み込んだファイル名（またはJSON内のタイトル）に更新
        document.title = `${loadedData.title || fileName} - A4縦書き15文字メモ`; 

        // 5. 上書きボタンの状態を更新
        updateOverwriteButtonStatus();

        editingFileNameSpan.textContent = `『${loadedData.title || fileName}』編集中`;

    } catch (error) {
        console.error(`ファイルID ${fileId} の読み込み中にエラー:`, error);
        alert(`ファイル『${fileName}』の読み込みに失敗しました。`);
        editingFileNameSpan.textContent = "ファイルの読み込みに失敗";
    }finally{
      loadingOverlay.style.display='none';//ローディングアニメーション終了。
    }
}



//上書き機能判別式
function updateOverwriteButtonStatus() {
    const uwagakiDiv = document.getElementById('Uwagakisave'); // 親のdivを取得
    const uwagakiButton = uwagakiDiv.querySelector('button'); // 中のbuttonを取得
    const accessToken = gapi.client.getToken();
    
    if(accessToken && accessToken.access_token && currentFileId){
       uwagakiButton.style.opacity='1';
    }else{
      uwagakiButton.style.opacity='0.2';
    }
}

// 上書き保存の修正版

uwagakisaveButton.addEventListener('click', async () => {

    if (!currentFileId) {
        alert('上書きファイルが指定されていません。保存ボタンから新規保存してください。');
        console.warn('currentFilrIdが存在しないため上書き処理を中断しました。');
        return;
    }
    

    const title = document.getElementById('titleInput').value;
    const verticalBlocks = a4Page.querySelectorAll('.vertical-block')
    const pagesData = [];

    verticalBlocks.forEach((verticalBlock) => {
        const serifTextarea = verticalBlock.querySelector('.vertical-text');
        const sceneTextarea = verticalBlock.querySelector('.title-text');
        pagesData.push({
            serif: serifTextarea.value,
            scene: sceneTextarea.value
        });
    });

    const fileDataObject = { title: title, pages: pagesData };
    const jsonString = JSON.stringify(fileDataObject, null, 2);
    const fullText = editingFileNameSpan.textContent; 
    const fileName = fullText.replace('『', '').replace('』編集中', '');

    try {
        loadingStatusText.textContent = `『${fileName}』を上書き中...`;
        loadingOverlay.style.display = 'flex';
        
        // ★修正: より明示的なヘッダー指定
        const response = await gapi.client.request({
            'path': `https://www.googleapis.com/upload/drive/v3/files/${currentFileId}`,
            'method': 'PATCH',
            'params': { 'uploadType': 'media' },
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': jsonString
        });

        
        // ★修正: 上書き後も内容確認
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 上書き後の内容確認
        try {
            const verifyResponse = await gapi.client.drive.files.get({
                fileId: currentFileId,
                alt: 'media'
            });
            if (verifyResponse.body === "") {
                console.error("警告: 上書き後でもファイルの中身が空です！");
            } else {
            }
        } catch (verifyError) {
            console.error("上書き後の確認エラー:", verifyError);
        }
        
    } catch (error) {
        alert("ファイルの上書き保存に失敗しました。コンソールを確認してください。")
    }finally{
      loadingOverlay.style.display='none';
    }
});

function openSaveModal(){
  let modalActionButton = document.getElementById('modalActionButton');
  const titleInput =document.getElementById('titleInput')
  const defaultFileName = titleInput.value.trim() !== "" ? titleInput.value.trim() : "untitled"; // 作品タイトルが空なら"untitled"に

  modalTitle.textContent = "新規/別名ファイル名を入力"; // タイトルをファイル名入力用に
  fileNameInput.style.display = 'block'; // ファイル名入力欄を表示する
  fileNameInput.value = defaultFileName; // 作品タイトルを初期値としてセット！
  modalActionButton.textContent = "保存"; // ボタンのテキストを「保存」に
  modalActionButton.style.display = 'block'; // 保存ボタンを表示する
  modalMessage.style.display = 'none'; // メッセージは非表示にする

    const newActionButton = modalActionButton.cloneNode(true);
    modalActionButton.parentNode.replaceChild(newActionButton, modalActionButton);

    newActionButton.addEventListener('click', async () => {
        const fileNameFromModal = fileNameInput.value.trim();
        if (!fileNameFromModal) {
            alert("ファイル名を入力してください");
            return;
        }
        hidefileModal();
        loadingStatusText.textContent = `『${fileNameFromModal}』を保存中...`;
        loadingOverlay.style.display = 'flex';
        await savesystem(fileNameFromModal);
      });

  showFileModal(); // モーダルを表示！

};

//保存
saveButton.addEventListener('click',async ()=>{
  const accessToken = gapi.client.getToken(); 
  const isLogedIn = checkUserLoginStatus();
  const isSwitchOn = driveConnectSwitch.checked;

  //一番うまくいった場合。ログインかつ許可あり
  if(accessToken && accessToken.access_token){
   openSaveModal();
  return;
  }

  //tokenなし　かつ　ログインなし
  if(!isLogedIn){

    modalTitle.textContent ="保存するにはログインが必要です！";
    fileNameInput.style.display ='none';
    modalActionButton.style.display ='none';
    modalMessage.style.display ='block';

    showFileModal();
    return;
  }
  //ログインあり　tokenなし　トグルオフ
 
  if(!isSwitchOn){

    modalTitle.textContent='Google Driveと連携されていません';
    modalMessage.textContent='保存機能を利用するには、GoogleDrive連携ボタンをオンにてください';
    fileNameInput.style.display = 'none';      // ファイル名入力欄は隠す
    modalActionButton.style.display = 'none';  // アクションボタンも隠す
    modalMessage.style.display = 'block';      // メッセージ欄を表示する

    showFileModal(); // モーダルを表示
    return; // これ以降の処理は不要なので、ここで抜ける
    }
    //ログイン済み　tokenなし　トグルオン
    else{

      modalTitle.textContent = "Google Driveと連携されていません";
      modalMessage.textContent = "右上のGoogleDrive連携ボタンを一度オフにしてから、再度オンにして連携を許可してください！";
        
      fileNameInput.style.display = 'none';      // ファイル名入力欄は隠す
      modalActionButton.style.display = 'none';  // アクションボタンも隠す
      modalMessage.style.display = 'block';      // メッセージ欄を表示する

      showFileModal(); // モーダルを表示
    
    }

  

});

function checkUserLoginStatus() {
    if(idTokenCredential){
      return true;
    }else{
      return false;
    }
}



// savesystem関数の修正版 - タイミング問題を解決

async function savesystem(fileNameFromModal) {

    const titleInput = document.getElementById('titleInput')
    const title = titleInput.value;
    const verticalBlocks = a4Page.querySelectorAll('.vertical-block')

    const pagesData = [];

    verticalBlocks.forEach((verticalBlock, index) => {
        const serifTextarea = verticalBlock.querySelector('.vertical-text');
        const sceneTextarea = verticalBlock.querySelector('.title-text');
        const serif = serifTextarea.value;
        const scene = sceneTextarea.value;
        const pageData = { serif: serif, scene: scene };
        pagesData.push(pageData)
    });

    const fileDataObject = { title: fileNameFromModal, pages: pagesData };

    const jsonString = JSON.stringify(fileDataObject, null, 2);

    if (!appFolderId) {
        console.error("アプリ専用フォルダのidが利用できません。フォルダの準備ができていない可能性あり");
        alert("ファイルの保存に失敗。フォルダの準備ができていません。");
        return;
    }

    try {
        const metadata = {
            'name': fileNameFromModal,
            'mimeType': 'application/json',
            'parents': [appFolderId]
        };
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            jsonString +
            close_delim;


        const request = await gapi.client.request({
            'path': 'https://www.googleapis.com/upload/drive/v3/files',//ファイル作成のエンドポイント
            'method': 'POST',//新規作成って意味です
            'params': { 'uploadType': 'multipart' },
            'headers': {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            'body': multipartRequestBody
        });


        currentFileId = request.result.id;

        // ★修正2: 保存後に少し待ってから確認
        await new Promise(resolve => setTimeout(resolve, 3000));

        // ★修正3: 保存直後にファイル内容を確認（デバッグ用）
        try {
            const verifyResponse = await gapi.client.drive.files.get({
                fileId: currentFileId,
                alt: 'media'
            });
            if (verifyResponse.body === "") {
                console.error("警告: 保存直後でもファイルの中身が空です！");
            } else {
            }
        } catch (verifyError) {
            console.error("保存直後の確認エラー:", verifyError);
        }

        updateOverwriteButtonStatus();
        

    } catch (error) {
        console.error("ファイル保存中にエラーが発生しました:", error);
        alert('ファイルの保存に失敗しました。コンソール確認してね。');
    }finally{
      loadingOverlay.style.display='none';
    }
}



// 削除ボタンがクリックされた時の処理
removeButton.addEventListener('click', () => {
  const verticalBlocks = a4Page.querySelectorAll('.vertical-block');
  if (verticalBlocks.length > 1) {
    a4Page.removeChild(verticalBlocks[verticalBlocks.length - 1]);
  }
});

function decodeJwtPayload(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
}



// ログイン確認です。
function GoogleCredentialResponse(response) {
  idTokenCredential= response;
  const token = response.credential;
  const payload = decodeJwtPayload(token);
  
  document.getElementById("googleLoginButton").style.display = "none";
  const userIcon = document.getElementById("userIcon");
  userIcon.innerHTML = `<img src="${payload.picture}" alt="User Icon" style="width: 32px; height: 32px; border-radius: 50%;">`;
  userIcon.style.display ="block";
 //ここでトグルを表示
  togleContainer.style.display='flex';
 //driveへのアクセス許可
  if(tokenClient){
    tokenClient.requestAccessToken({ prompt: '' }); 
  }else{
    console.error("TokenClientがまだ初期化されていない");
    alert("アプリケーションの初期化が完了していません。しばらく待ってから再度お試しください。");
  }
}

//ログアウト
document.getElementById("userIcon").addEventListener("click", () => {
  const wantsTosignOut = confirm('ログアウトしますか')
  if(wantsTosignOut){
  togleContainer.style.display='none';
  const userIcon = document.getElementById("userIcon");
  userIcon.innerHTML = '';
  userIcon.style.display = "none";
  document.getElementById("googleLoginButton").style.display ="block"
  }
});

 // アプリ専用フォルダを検索または作成する関数
async function ensureAppFolder() {

    try {
        // 1. フォルダを検索する
        const response = await gapi.client.drive.files.list({
            pageSize: 1, // 1件見つかれば十分
            fields: 'files(id)', // IDだけ取得
            q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`, // 名前とフォルダタイプで検索、ゴミ箱にないもの
        });

        const files = response.result.files;

        if (files && files.length > 0) {
            // フォルダが見つかった場合
            appFolderId = files[0].id;
        } else {
            // フォルダが見つからなかった場合、新しく作成する
            const fileMetadata = {
                'name': APP_FOLDER_NAME,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': ['root'] // ルートフォルダ直下に作成
            };
            const createResponse = await gapi.client.drive.files.create({
                resource: fileMetadata,
                fields: 'id' 
            });

            appFolderId = createResponse.result.id;
        }

    } catch (error) {
        console.error(`${APP_FOLDER_NAME} フォルダの確認または作成中にエラーが発生しました:`, error);
        alert("アプリ専用フォルダの準備に失敗しました。コンソールを確認してください。");
    }
}

//gapiが読み込まれた後
  async function initClientAndDrive() {
    
    try {
        await gapi.client.init({
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],   
        });

        const currentToken = gapi.client.getToken();
        if (currentToken && currentToken.access_token) {

            await ensureAppFolder(); 
            updateFileOperationButtons(true); 
            document.getElementById("googleLoginButton").style.display = "none";
            document.getElementById("userIcon").style.display = "block";
            
          } else {
          }
    } catch (error) {
        console.error('GAPI client または Token Client の初期化エラー:', error);
        alert("アプリケーションの初期化中にエラーが発生しました。コンソールを確認してください。");
        updateFileOperationButtons(false); 
        document.getElementById("googleLoginButton").style.display = "block";
        document.getElementById("userIcon").style.display = "none";
    }
    updateOverwriteButtonStatus();//上書きがオンになる
  }

//gapiが読み込まれたら
function handleGapiLoad(){
  gapi.load('client', function(){
     
     // initClientAndDriveの実行結果(Promise)をgapiInitPromiseに代入する
     gapiInitPromise = initClientAndDrive();
  });
}
function gisLoaded(){
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id:'95542228537-pnnjojb0i28mvjc4l3srgpmjnbkt0f71.apps.googleusercontent.com',
          scope: DRIVE_SCOPE,

          callback: async (tokenResponse) => {
            if(tokenResponse && tokenResponse.access_token){

             
              try {
                // GAPIクライアントの初期化が完了するのを待つ
                if (gapiInitPromise) {
                    await gapiInitPromise;
                } else {
                    // 通常このエラーは発生しないはずですが、念のため
                    throw new Error('GAPIの初期化プロセスが開始されていません。');
                }

                gapi.client.setToken(tokenResponse); 

                await ensureAppFolder();

                driveStatusText.textContent= driveStatusText.dataset.on;
                driveConnectSwitch.checked =true;
                driveConnectSwitch.disabled= true;
                updateFileOperationButtons(true);

              } catch (error) {
                  console.error("GAPIの準備待機中、または連携処理中にエラーが発生しました:", error);
                  alert("Google Driveとの連携に失敗しました。ページを再読み込みしてお試しください。");
                  // エラーが発生した場合のUIフォールバック
                  if(driveConnectSwitch) driveConnectSwitch.checked = false;
                  updateFileOperationButtons(false);
              }
            }else{
              alert("googleDriveへのアクセス権限取得に失敗");
              const driveConnectSwitch = document.getElementById('driveConnectSwitch');
              if (driveConnectSwitch) {
                driveConnectSwitch.checked = false;
              }
               updateFileOperationButtons(false);
            }
          }
        });
      }

driveConnectSwitch.addEventListener('click',()=>{
 
  if(driveConnectSwitch.checked){
    tokenClient.requestAccessToken({prompt:'consent'});

  }
});




//読み込みファイル一覧におけるメニュー機能
const FileListContainer = document.getElementById('driveFileListContainer')

// 右クリックでメニューを起動
FileListContainer.addEventListener('contextmenu', (event) => {
  //特定のファイルをclickedItemに格納
  const clickedItem = event.target.closest('.drive-file-item') 
  if(clickedItem){
    event.preventDefault();//標準右クリックメニュー停止
    showMenue(event,clickedItem);
  }
});
//メニュー表示関数
function showMenue(event,clickedItem){
  const menueContainer =document.getElementById("menueContainer");
  //定数にクリックしたファイルのdata属性に紐付けられた値（ファイルId）を格納
  const fileId= clickedItem.dataset.fileId;
  //menuecontainerにファイルidの値をdata-targe-file-idと紐付ける。
  //消去や名前変更関数に情報を送るときにこのmenucontainerのdata属性の値を使用する。
  menueContainer.dataset.targetFileId = fileId;

  //ここでmenueを表示する理由はstyleをブロックにしないとmenuの幅が0になるから。なので先に表示する。
  menueContainer.style.display = "block";

    const menueWidth = menueContainer.offsetWidth;   
    const menuHeight = menueContainer.offsetHeight; 
    const windowWidth = window.innerWidth;       
    const windowHeight = window.innerHeight;     

    let left = event.pageX;
    let top = event.pageY;

    // もしメニューが右にはみ出るなら、カーソルの左側に表示
    if (event.clientX + menueWidth > windowWidth) {
        left = event.pageX - menueWidth;
    }
    // もしメニューが下にはみ出るなら、カーソルの上側に表示
    if (event.clientY + menuHeight > windowHeight) {
        top = event.pageY - menuHeight;
    }
    menueContainer.style.left = left + 'px';
    menueContainer.style.top = top + 'px';
};

/*将来実装予定（3点ボタン）
//三点ボタンstep1
FileListContainer.addEventListener('click', (event) => {
  // ここに左クリックされた時の処理を書
    const clickedButton =event.target.closest('.file-options-button');//三点ボタンのこと

    if(clickedButton){
      const fileItem = clickedButton.closest('.drive-file-item');
      const fileId = fileItem.dataset.fileId;
      showMenue(event,fileItem);
    }
  });
*/

//ファイル消去機能3
const removeMenueButton= document.getElementById("menuDelete");
const fileNameUpdatebutton = document.getElementById("menuRename");
//消去ボタン
removeMenueButton.addEventListener('click',async ()=>{
  const isConfirmed = confirm("本当にこのファイルを消去しますか？\nこの操作は元に戻せません。");
  const menueContainer =document.getElementById("menueContainer");
  if(isConfirmed){
  const idToDelete = menueContainer.dataset.targetFileId;//idtodeleteにファイルidを格納。
  const idSuccess= await deletefileFromDrive(idToDelete);
  if(idSuccess){
    const itemToDelete = document.querySelector(`[data-file-id="${idToDelete}"]`);
    itemToDelete?.remove();//これ一行で描けるらしい。存在するなら実行って意味。
    //if(itemToDelete){
    //itemToDelete.remove();
    //}
    menueContainer.style.display="none"
  }else{
    menueContainer.style.display='none'
       }
  }
});
//消去関数　分けた理由は今後の拡張性4
async function deletefileFromDrive(fileId){
  if(!fileId){
    console.error("ファイルのIdが指定されていません");
    return false;
  }

  try{
    await gapi.client.drive.files.delete({
      'fileId': fileId
    });
    return true
  }catch(error){
    console.error(`ファイルID: ${fileId} の削除中にエラーが発生しました:`, error);
    alert('ファイル消去に失敗')
    return false;//これがないと、この関数を引き出したifの中身（success）がtrue　falseか判別できない。
  }

}

//ファイルid取得とモーダル表示 名前変更step1
fileNameUpdatebutton.addEventListener('click',async ()=>{
  const menuecontainer= document.getElementById("menueContainer");
  const idToNameUpdate= menuecontainer.dataset.targetFileId;//fileid取得！
  
  reNameModal(idToNameUpdate);
});

//upadteとhtml内の名前書き換え。３
async function updateFileName(fileId,newFileName){
  try{
    await gapi.client.drive.files.update({
      fileId:fileId,
      resource:{
         name: newFileName
      }
    });

    const listItem = document.querySelector(`[data-file-id="${fileId}"]`);
    if(listItem){
      const fileNameSpan = listItem.querySelector('.file-name');
      fileNameSpan.textContent = newFileName;
    }
    alert('ファイル名を変更しました。');
  }catch(error){
    alert('ファイル名の更新に失敗しました');
    return false;
  }
}


//名前変更step2
function reNameModal(fileId){
 let modalActionButton = document.getElementById('modalActionButton')
 modalTitle.textContent='新しいファイル名を入力';
 const listItem = document.querySelector(`[data-file-id="${fileId}"]`);
 const currentName = listItem.querySelector('.file-name').textContent;
 fileNameInput.value =currentName;
 modalActionButton.textContent='変更';

 //イベントリスナーの重複を防ぐ。モーダルアクションを複製した。
 const reNameActionButton = modalActionButton.cloneNode(true);
 //親要素から子要素を入れ替え
 modalActionButton.parentNode.replaceChild(reNameActionButton,modalActionButton);
//これにより、前のイベントリスナーが重複することはなく、まったく常に前のmodalActionButtonが複製されてまっさらな状態になってる。

 //変更ボタンクリック
 reNameActionButton.addEventListener('click',async ()=>{
  const newFileName= fileNameInput.value.trim();

  if(newFileName){
    await updateFileName(fileId,newFileName);
  }
  fileModalOverlay.style.display='none';
 });
  fileModalOverlay.style.display='flex';

}

// メニューの外側クリックで閉じる
window.addEventListener('click', (event) => {
    const menueContainer = document.getElementById('menueContainer');
    if (menueContainer.style.display === 'block') {
        if (!event.target.closest('#menueContainer')) {
            menueContainer.style.display = 'none';
        }
    }
});

// 3秒ごとに自動保存
setInterval(() => {
  const title = document.getElementById('titleInput').value;
  const pages = [];
  document.querySelectorAll('.vertical-block').forEach(block => {
    const serif = block.querySelector('.vertical-text').value;
    const scene = block.querySelector('.title-text').value;
    pages.push({ serif, scene });
  });

  const autoSaveData = { title, pages };

  // mangaSerifAutoSaveとうキーで中身をストレージに保存
  localStorage.setItem('mangaSerifAutoSave', JSON.stringify(autoSaveData));
}, 3000); 

// ページ読み込み時に、自動保存されたデータを復元する関数
function restoreFromAutoSave() {
  const savedDataString = localStorage.getItem('mangaSerifAutoSave');
  if (savedDataString) {
    const savedData = JSON.parse(savedDataString);
    document.getElementById('titleInput').value = savedData.title || '';

    // 既存のページをクリアして要素と中身を追加したvarticalblockを生成
    const a4Page = document.querySelector('.a4-page');
    a4Page.querySelectorAll('.vertical-block').forEach(block => block.remove());

    savedData.pages.forEach((page, index) => {
      const newBlock = document.createElement('div');
      newBlock.className = 'vertical-block';
      newBlock.innerHTML = `
        <p>${index + 1}p</p>
        <textarea class="vertical-text" placeholder="セリフを入力…">${page.serif || ''}</textarea>
        <textarea class="title-text" placeholder="シーンを入力…">${page.scene || ''}</textarea>
      `;
      a4Page.appendChild(newBlock);
    });
  }
}

// 読み込み時の復元処理
restoreFromAutoSave();
//読み込み時の操作ボタンオフ
updateFileOperationButtons(false);

 OptionButton.addEventListener('click',()=>{
  alert('現在このボタンは使えません。今後内容を追加する予定です。');
 });