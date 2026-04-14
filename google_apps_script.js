/**
 * [버전 4.0] 고양이 테트리스 리더보드 (도착 시간 분/초 보기 포맷 기록 버전)
 */

const SHEET_ID = '123JlbA69IGJkfDz29lBkcde-n-dBeSAIamC3BQIyjOw';
const SHEET_NAME = '테트리스_기록';

function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    let name = "Unknown";
    let totalMs = 0;

    if (e.postData && e.postData.contents) {
      const data = JSON.parse(e.postData.contents);
      name = data.name || 'Guest';
      totalMs = (parseInt(data.time || 0) * 1000) + parseInt(data.ms || 0);
    }

    // 시간 포맷 생성 (예: 1분 20.초 45)
    let m = Math.floor(totalMs / 60000);
    let s = Math.floor((totalMs % 60000) / 1000);
    let ms = Math.floor((totalMs % 1000) / 10);
    let formattedTime = m + "분 " + s + "초 " + (ms < 10 ? "0"+ms : ms);

    const timestamp = new Date();
    // 엑셀에 [닉네임, 보기 편한 시간, 밀리초(정렬용), 저장시간] 순으로 기록
    sheet.appendRow([name, formattedTime, totalMs, timestamp]);
    
    // 3번째 열(밀리초) 기준으로 오름차순 정렬 (초가 적을수록 1등)
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).sort({column: 3, ascending: true});
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      top3: getTopScores(3)
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    top3: getTopScores(3)
  })).setMimeType(ContentService.MimeType.JSON);
}

function testSheet() {
  const sheet = getOrCreateSheet();
  sheet.appendRow(["테스트유저", "1분 11초 11", 71110, new Date()]);
  Logger.log("해당 엑셀 파일에 새로운 포맷으로 데이터가 저장되었습니다!");
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['사용자 닉네임', '기록 (분:초)', '밀리초 (앱 내부정렬용)', '기록일시']); // 한글 헤더 추가
    
    // 헤더 꾸미기
    const headerRange = sheet.getRange(1, 1, 1, 4);
    headerRange.setBackground('#f3f3f3').setFontWeight('bold');
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 150);
    sheet.setColumnWidth(4, 200);
  }
  return sheet;
}

function getTopScores(limit) {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  // 1열부터 4열까지 데이터 가져오기
  const data = sheet.getRange(2, 1, Math.min(lastRow - 1, limit), 4).getValues();
  return data.map((row, i) => ({
    id: "record_" + i,
    name: row[0],
    totalMs: row[2] // 앱 연동용으로는 밀리초 그대로 전달 (프론트에서 비교해야 하므로)
  }));
}
