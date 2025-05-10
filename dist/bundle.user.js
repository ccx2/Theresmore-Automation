// ==UserScript==
// @name        Synergism
// @namespace   corocoro
// @match       https://synergism.cc/*
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_log
// @version     25
// @author      corocoro
// @description Adds various buttons for easier grinding
// ==/UserScript==

/*
 * Version 25 (2025-05-04): Add codes are now redeemed with ambrosia loadout. Just pseudo it.
 * Version 24 (2025-05-03): ccPseudoSingBuildup: Added a step between P4x3 and P4x5.
 * Version 23 (2025-04-30): ccPseudoSingChallengeSweep: Added another condition to while loop to finally get rid of stuck situation (hopefully)
 * Version 22 (2025-04-27): ccPseudoSingChallengeSweep: Simplified logic to prevent stuck situations
 * Version 21 (2025-04-27): ccPseudoSingAchievements now exits challenges afterward. Don't read/red without blue only trigger if achievement hasn't been gotten
 * Version 20 (2025-04-27): Step backs fixed. Moved don't read after the initial challenge sweep for lower run time. Achievements 42/49/56 are now only picked up if they weren't gotten before.
 * Version 19 (2025-04-26): Expanded logging to figure out where the script needs to step back.
 * Version 18 (2025-04-26): Expanded logging to determine optimal loop count
 * Version 17 (2025-04-26): Switched log to give quarks in the current singularity for better tracking
 * Version 16 (2025-04-26): Added a button to finish the sing without resetting
 * Version 15 (2025-04-26): ccPseudoSingAscend: Fixed the security function
 * Version 14 (2025-04-26): ccPseudoSingPushCubes: Does two cycles now to increase quark gain
 * Version 13 (2025-04-26): ccPseudoSingBuildup && ccPseudoSingGrindUpgrades && ccPseudoSingAscend: Expanded to make more robust against getting stuck
 * Version 12 (2025-04-26): ccPseudoSingAllAchievements: Security check for rewritten code; className includes switched to classList contains
 * Version 11 (2025-04-26): ccPseudoSingAllAchievements: Rewrote code for don't read / red without blue
 * Version 10 (2025-04-26): ccPseudoSingBuildup: Found another stuck situation
 * Version 9 (2025-04-26): ccPseudoSingAllAchievements: Attempt to fix the stuck situation again
 * Version 8 (2025-04-25): ccPseudoSingAllAchievements: Greatly increased waiting time for inception to aovid getting stuck
 * Version 7 (2025-04-25): ccPseudoSingBuildup: Added extra ascend to avoid getting stuck
 * Version 6 (2025-04-25): ccPseudoSingGrindUpgrades: Fixed missing await
 * Version 5 (2025-04-25): Added Quarks button
 * Version 4 (2025-04-25): Added Pseudo Sing Code and simplified ambrosia / oct code with new functions
 * Version 3 (2025-04-24): Added more buttons to stop all loops (works) and to do pseudo sings (doesn't do anything yet)
 * Version 2 (2025-04-24): Added a button to toggle ambrosia / oct optimizer
 * Version 1 (2025-04-24): Ported ambrosia / oct optimizer to TamperMonkey
*/

//--- Create the container.
var ccButtonContainer = document.createElement('div');
ccButtonContainer.setAttribute('id', 'ccButtonContainer');

//--- Define the buttons.
ccButtonContainer.innerHTML =
    '<button id="ccResetBtn" type="button">Stop all</button></div>'
    + '<button id="ccQuarksBtn" type="button">Quarks</button></div>'
    + '<button id="ccAmbrosiaBtn" type="button">Init failed!</button></div>'
    + '<button id="ccPseudoSingBtn" type="button">Init failed!</button></div>'
    + '<button id="ccCompleteSingBtn" type="button">Sing</button></div>';

//--- Add the container.
document.body.appendChild (ccButtonContainer);

//------------------ Reset Button -----------------------------//
//--- Activate the newly added button.
document.getElementById ('ccResetBtn').addEventListener (
    "click", ccResetBtnClickAction, false
);

//--- Activate the button click-handler.
function ccResetBtnClickAction () {
    ccAmbrosiaBtnControl.Reset ();
    ccPseudoSingBtnControl.Reset ();
}

//------------------ Quarks Button ------------------------------//
//--- Activate the newly added button.
document.getElementById ('ccQuarksBtn').addEventListener (
    "click", ccQuarksBtnClickAction, false
);

//--- Activate the button click-handler.
async function ccQuarksBtnClickAction () {
    await ccPseudoAddsAndQuarks();
}

//------------------ Ambrosia Button -----------------------------//
//--- Define and init the matching control object:
var ccAmbrosiaBtnControl = new PersistentButton (
    "ccAmbrosiaBtn",        //-- HTML id
    "ccAmbrosiaBtnState",   //-- Storage label
    ["Ambrosia", "Stop"],   //-- Text that the button cycles through
    [false, true]           //-- Matching values for the button's states
);

//--- Activate the newly added button.
document.getElementById ('ccAmbrosiaBtn').addEventListener (
    "click", ccAmbrosiaBtnClickAction, false
);

//--- Activate the button click-handler.
function ccAmbrosiaBtnClickAction () {
    ccAmbrosiaBtnControl.SetNextValue ();
    if (this.value == "true") {
        ccAmbrosiaBtnAction();
    }
}

//------------------ Pesudo Sync Button -----------------------------//
//--- Define and init the matching control object:
var ccPseudoSingBtnControl = new PersistentButton (
    "ccPseudoSingBtn",       //-- HTML id
    "ccPseudoSingBtnState",  //-- Storage label
    ["Pseudo", "Stop"],        //-- Text that the button cycles through
    [false, true]            //-- Matching values for the button's states
);

//--- Activate the newly added button.
document.getElementById ('ccPseudoSingBtn').addEventListener (
    "click", ccPseudoSingBtnClickAction, false
);

//--- Activate the button click-handler.
function ccPseudoSingBtnClickAction () {
    ccPseudoSingBtnControl.SetNextValue ();
    if (this.value == "true") {
        ccPseudoSingBtnAction();
    }
}

//------------------ Complete Sing Button -------------------------//
//--- Activate the newly added button.
document.getElementById ('ccCompleteSingBtn').addEventListener (
    "click", ccCompleteSingBtnClickAction, false
);

//--- Activate the button click-handler.
async function ccCompleteSingBtnClickAction () {
    await ccCompleteSing();
}



//------------------ Ambrosia Button Functionality ------------------//
async function ccAmbrosiaBtnAction() {
    while (document.getElementById('ccAmbrosiaBtn').value == "true") {
        var MAX_AMBROSIA_GAIN = 70; // Ambrosia gain at max luck
        var ambrosiaData = document.getElementById('ambrosiaProgressText').childNodes[0].data.replaceAll('.', '').replaceAll(',', '').match(/\d+/g)
        var redAmbrosiaData = document.getElementById('pixelProgressText').childNodes[0].data.replaceAll('.', '').replaceAll(',', '').match(/\d+/g)
            if (document.getElementById('ambrosiaAmountPerGeneration').childNodes[1] === undefined) {
                return
            };
        var ambrosiaGain = document.getElementById('ambrosiaAmountPerGeneration').childNodes[1].innerText
            if ((ambrosiaGain < MAX_AMBROSIA_GAIN - 0.1)
                && ((ambrosiaData[1] - ambrosiaData[0] < ambrosiaData[2] * 0.5) || (redAmbrosiaData[1] - redAmbrosiaData[0] < redAmbrosiaData[2] * 0.5))) {
                await ccPseudoSingSelectAmbLoadout(4); // Ambrosia loadout
            };
        if ((ambrosiaGain > MAX_AMBROSIA_GAIN - 0.1)
           && (ambrosiaData[1] - ambrosiaData[0] > ambrosiaData[2] * 0.5)
           && (redAmbrosiaData[1] - redAmbrosiaData[0] > redAmbrosiaData[2] * 0.5)) {
            ccPseudoSingSelectAmbLoadout(3); // Octeract loadout
        };
        await sleep(200);
    }
}


//------------------ Pseudo Sing Button Functionality ---------------//
async function ccPseudoSingBtnAction() {
  while (document.getElementById('ccPseudoSingBtn').value == "true") {
    await ccPseudoSingReset();
    await ccCompleteSing();
  }
}


//------------------ Complete Sing Functionality -----------------//
async function ccCompleteSing() {
  var startDate = new Date();
  await ccPseudoSing0();
  await ccPseudoSingBuildup();
  await ccPseudoSingAllAchievements();
  var loopCount = 1;
  await ccPseudoSingPushCubes(loopCount);
  await ccPseudoAddsAndQuarks();
  var seconds = Math.floor((new Date() - startDate) / 1000) + " Seconds";
  await clickBtn('switchSettingSubTab4');
  var quarks = document.getElementById('sMiscNQuarksThisSingularity').innerText + " Quarks";
  console.log(getTimestamp () + ": " + quarks + ", " + seconds + ", " + loopCount + " loops");
}

async function ccPseudoSingReset() {
  for (i = 0; i < 2; i++){
    await clickBtn('toggleChallengesSubTab2');
    await clickBtn('noSingularityUpgrades');
    await clickBtn('ok_confirm', 500);
    await clickBtn('ok_alert');
    await clickBtn('buycoin1');
  }
  return 1;
}

async function ccPseudoSing0() {
  await clickBtn('prestigebtn', 250);
  await clickBtn('transcendbtn', 250);
  await clickBtn('reincarnatebtn', 250);
  await ccPseudoSingAscend();
  return 1;
}

async function ccPseudoSingBuildup() {
  while (await ccPseudoSingLastC10() <= 5) {await ccPseudoSingAscend()};
  await ccPseudoSingChallengeSweep();
  if (!document.getElementById('ach249').classList.contains('green-background')) { await ccPseudoSingAchievements(13, 249); }  // Don't read
  await ccPseudoSingGrindUpgrades(250, "achievement", 1);
  await ccPseudoSingGrindUpgrades(251, "achievement", 2);
  while (await ccPseudoSingLastC10() <= 70) {await ccPseudoSingAscend()};
  await ccPseudoSingGrindUpgrades(8, "platonic", 3);
  await ccPseudoSingGrindUpgrades(11, "platonic", 4);
  await ccPseudoSingChallengeSweep();
  await ccPseudoSingGrindUpgrades(14, "platonic", 5);
  await ccPseudoSingGrindUpgrades(16, "platonic", 6);
  await ccPseudoSingGrindUpgrades(15, "platonic", 7, 8000);
  await ccPseudoSingChallengeSweep();
  await ccPseudoSingGrindUpgrades(18, "platonic", 8, 8000, true);
  await ccPseudoSingGrindUpgrades(20, "platonic", 12, 8000, true);
  await ccPseudoSingChallengeSweep(1000);
  return 1;
}

async function ccPseudoSingAllAchievements() {
  // Get the prestige (42) / transcend (49) / reincarnation (56) achievements
  if (!document.getElementById('ach42').classList.contains('green-background')
      || !document.getElementById('ach49').classList.contains('green-background')
      || !document.getElementById('ach56').classList.contains('green-background')) {
    await sleep(5000);
    if (document.getElementById('toggleAutoChallengeStart').textContent == "Auto Challenge Sweep [ON]") { await clickBtn('toggleAutoChallengeStart'); }
    await clickBtn('challengebtn');
    await clickBtn('reincarnatechallengebtn');
    await clickBtn('prestigebtn', 250);
    await clickBtn('transcendbtn', 250);
    await clickBtn('reincarnatebtn', 250); // Probably the only one missed in setup
    await clickBtn('toggleAutoChallengeStart');
  }
  // One in a trillion
  await clickBtn('switchCubeSubTab1');
  await clickBtn('open1Cube');
  // Inception
  await ccPseudoSingChallenge(15, false, 5000);
  await ccPseudoSingChallenge(6);
  await ccPseudoSingChallenge(1, false, 250, false);
  await ccPseudoSingChallenge(15);
  // Red without blue
  if (!document.getElementById('ach248').classList.contains('green-background')) { await ccPseudoSingAchievements(14, 248); }
  // Codes
  await ccPseudoSingEnterCode('synergism2021');
  await ccPseudoSingEnterCode('Khafra');
  await ccPseudoSingEnterCode(':unsmith:');
  await ccPseudoSingEnterCode(':antismith:');
  return 1;
}

async function ccPseudoSingPushCubes(loopCount = 1) {
  await ccPseudoSingChallenge(11, true, 8000, true, 13);
  for (i = 0; i < loopCount; i++) {
    await ccPseudoSingSelectCorLoadout(14);
    await clickBtn('ascendbtn');
    await ccPseudoSingAscend(8000);
    await ccPseudoSingChallenge(15, false, 8000);
    await ccPseudoSingChallenge(11, true, 8000, true, 15);
  }
  await ccPseudoSingChallenge(11, false, 5000);
  return 1;
}

async function ccPseudoAddsAndQuarks() {
  await ccPseudoSingSelectAmbLoadout(4);
  await clickBtn('switchSettingSubTab1');
  await clickBtn('timeCode', 250);
  if (document.getElementById('confirmWrapper').style.display == "block") { await clickBtn('ok_confirm'); }
  if (document.getElementById('alertWrapper').style.display == "block") { await clickBtn('ok_alert'); }
  await clickBtn('addCodeAll');
  await ccPseudoSingSelectAmbLoadout(1);
  await clickBtn('switchSettingSubTab1');
  await clickBtn('dailyCode');
  while (document.getElementById('alertWrapper').style.display == "block") { await clickBtn('ok_alert'); }
  await clickBtn('exportgame');
  await ccPseudoSingSelectAmbLoadout(2);
  await ccPseudoSingAscend();
  await clickBtn('switchCubeSubTab4');
  await clickBtn('open1PlatonicCube');
  await ccPseudoSingSelectAmbLoadout(2);
  return 1;
}

async function ccPseudoSingGrindUpgrades(upgradeNumber, typeName, corruptionLoadout = -1, ms = 250, inChallenge11 = false) {
  var upgradeName = "placeholder";
  if (typeName == "achievement") {
    await clickBtn('achievementstab');
    upgradeName = 'ach' + upgradeNumber;
  }
  else if (typeName == "platonic") {
    await clickBtn('switchCubeSubTab6');
    upgradeName = 'platUpg' + upgradeNumber;
  }
  else {return 0};

  if (corruptionLoadout >= 0) { await ccPseudoSingSelectCorLoadout(corruptionLoadout); }

  var singCounter = 0;
  if (inChallenge11) { ccPseudoSingChallenge(11, false, ms); }
  while(!document.getElementById(upgradeName).classList.contains('green-background')) {
    await ccPseudoSingAscend(ms, corruptionLoadout);
    singCounter++;
    if (singCounter % 10 == 0) {
      await ccPseudoSingChallenge(15, true, 8000);
      if (inChallenge11) { await ccPseudoSingChallenge(11, false, ms); }
    }
  }
  return 1;
}

async function ccPseudoSingAchievements(challengeNumber, upgradeNumber) {
  await ccPseudoSingChallenge(challengeNumber, false);
  while(!document.getElementById('ach' + upgradeNumber).classList.contains('green-background')) {
    await sleep(250);
    if(!document.getElementById('challenge' + challengeNumber).classList.contains("challengeActive")) { await ccPseudoSingChallenge(challengeNumber, false); }
  }
  await clickBtn('ascendChallengeBtn');
  await clickBtn('ok_confirm');
  return 1;
}

async function ccPseudoSingSelectCorLoadout(loadoutSlot) {
 if(document.getElementById('traits').style.display != "flex" || document.getElementById('corruptionLoadouts').style.display != "flex") { await clickBtn('corrLoadoutsBtn'); }
  corruptionLoadoutTable.rows[1 + loadoutSlot].childNodes[10].firstElementChild.click();
  await sleep(50);
  return 1;
}

async function ccPseudoSingSelectAmbLoadout(loadoutSlot) {
  if(document.getElementById('singularity').style.display != "block" || !document.getElementById('toggleSingularitySubTab4').classList.contains('active-subtab')) { await clickBtn('toggleSingularitySubTab4'); }
  await clickBtn('blueberryLoadout' + loadoutSlot);
  await clickBtn('ok_alert');
}

async function ccPseudoSingChallengeSweep() {
  await ccPseudoSingSelectCorLoadout(0);
  await ccPseudoSingChallenge(11, false, 500);
  await ccPseudoSingChallenge(12, false, 500);
  await ccPseudoSingChallenge(13, false, 500);
  await ccPseudoSingChallenge(14, false, 500);
  await ccPseudoSingChallenge(15, true, 8000);
  return 1;
}

async function ccPseudoSingChallenge(challengeNumber, autoExit = false, ms = 250, activateAutoChallenge = true, corruptionLoadout = -1) {
  await clickBtn('challengetab');
  var autoChallengeActivated = (document.getElementById('toggleAutoChallengeStart').textContent == "Auto Challenge Sweep [ON]");
  if (activateAutoChallenge != autoChallengeActivated) { await clickBtn('toggleAutoChallengeStart'); }

  if (corruptionLoadout >= 0) { await ccPseudoSingSelectCorLoadout(corruptionLoadout); }

  await dbclickBtn('challenge' + challengeNumber, 100);

  if (challengeNumber != 15) {
    while (document.getElementById('ascC10CompletionsStats').innerText == "0"
           || document.getElementById('challenge10').classList.contains("challengeActive")
           || document.getElementById('challenge' + challengeNumber + 'level').innerText.startsWith("0")) {
      await sleep(ms);
      if(ascLen.innerText.includes('m')) {
        await clickBtn('ascendChallengeBtn');
        await clickBtn('ok_confirm');
        await ccPseudoSingAscend(ms, corruptionLoadout);
        await dbclickBtn('challenge' + challengeNumber, 100);
      }
    }
  }
  else { await sleep(ms); }

  if(autoExit) {
    await clickBtn('ascendChallengeBtn');
    await clickBtn('ok_confirm');
  }
  return 1;
}

async function ccPseudoSingAscend(ms = 250, corruptionLoadout = -1) {
  if (document.getElementById('toggleAutoChallengeStart').textContent != "Auto Challenge Sweep [ON]") {
    await clickBtn('toggleChallengesSubTab1');
    await clickBtn('toggleAutoChallengeStart');
  }

  while (document.getElementById('ascC10CompletionsStats').innerText == "0" || document.getElementById('challenge10').classList.contains("challengeActive")) {
    await sleep(ms);
    if(corruptionLoadout >= 0 && ascLen.innerText.includes('m')) {
      console.log("Step back. Current loadout: " + corruptionLoadout + ", last C10: " + await ccPseudoSingLastC10())
      await ccPseudoSingSelectCorLoadout(corruptionLoadout - 1);
      await clickBtn('ascendbtn');
      await ccPseudoSingSelectCorLoadout(corruptionLoadout);
      await ccPseudoSingAscend(ms);
    }
  }

  await clickBtn('ascendbtn');
  return 1;
}

async function ccPseudoSingEnterCode(code) {
  if(document.getElementById('settings').style.display != "block" || !document.getElementById('settingsubtab').classList.contains("subtabActive")) { await clickBtn('switchSettingSubTab1'); }
  await clickBtn('promocodes', 100);
  document.getElementById('prompt_text').value = code;
  await sleep(100);
  await clickBtn('ok_prompt');
  return 1;
}

async function ccPseudoSingLastC10() {
  var lastC10 = 0;
  Array.prototype.find.call(document.getElementById('historyAscendTable').rows[0].childNodes, function(child) {
    if (child.innerHTML.includes('"C10"')) {
      lastC10 = child.innerText
    }
  })
  return lastC10;
}

//------------------ Helper section ---------------------------------//
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); };

function getTimestamp () {
  var curDate = new Date();
  var months = ("0" + curDate.getMonth()).slice(-2);
  var days = ("0" + curDate.getDay()).slice(-2);
  var hours = ("0" + curDate.getHours()).slice(-2);
  var minutes = ("0" + curDate.getMinutes()).slice(-2);
  var seconds = ("0" + curDate.getSeconds()).slice(-2);
  return String.prototype.concat(curDate.getFullYear(), "-", months, "-", days, " ", hours, ":", minutes, ":", seconds);
}

async function clickBtn(btnName, ms = 50) {
  var btn = document.getElementById(btnName);
  if (btn.attributes.i18n != undefined) {
    var i18nNames = btn.attributes.i18n.nodeValue.split(".");
    if (i18nNames[0] == "tabs" && i18nNames[1] != "main") {
      var superDoc = document.getElementById(i18nNames[1]);
      if (superDoc.style.display != "block" && superDoc.style.display != "flex") {
        if (i18nNames[1] == "cubes") { document.getElementById('cubetab').click(); }
        else { document.querySelectorAll('[i18n="tabs.main.' + i18nNames[1] + '"]')[0].click(); }
        await sleep(ms);
      }
    }
    if (i18nNames[0] == "tabs" && i18nNames[1] == "main" && i18nNames[2] == "settings") {
      var superDoc = document.getElementById('settings');
      if (superDoc.style.display != "block" && superDoc.style.display != "flex") {
        document.getElementById('settingstab').click();
        await sleep(ms);
      }
    }
    else if (i18nNames[0] == "corruptions") {
      if (document.getElementById('traits').style.display != "flex") {
        document.getElementById('traitstab').click();
        await sleep(ms);
      }
    }
  }
  document.getElementById(btnName).click();
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function dbclickBtn(btnName, ms = 50) {
  var btn = document.getElementById(btnName);
  var clickEvent = document.createEvent ('MouseEvents');
  clickEvent.initEvent ('dblclick', true, true);
  btn.dispatchEvent (clickEvent);
  return new Promise(resolve => setTimeout(resolve, ms));
}

//--- CSS styles to make it work and to improve appearance.
GM_addStyle (`
    #ccButtonContainer {
        background:         orange;
        color:              black;
        position:           fixed;
        bottom:             1em;
        right:              1em;
        z-index:            6666;
        padding:            1em;
        border:             3px double gray;
        border-radius:      1ex;
        opacity:            0.8;
    }
    #ccButtonContainer button {
        cursor:             pointer;
        padding:            1em;
        border:             3px double gray;
    }
    #ccButtonContainer button:hover {
        color:              red;
    }`
);

//--- Button object
function PersistentButton (htmlID, setValName, textArry, valueArry) {
    //--- Initialize the button to last stored value or default.
    var buttonValue     = valueArry[0];
    fetchValue ();
    storeValue ();      //-- Store, in case it wasn't already.
    setButtonTextAndVal ();

    //--- DONE with init.  Set click and keyboard listeners externally.

    //***** Public functions:
    this.Reset          = function () {
        buttonValue     = valueArry[0];
        storeValue ();
        setButtonTextAndVal ();
    };

    this.SetNextValue   = function () {
        var numValues   = valueArry.length;
        var valIndex    = 0;

        for (var J = numValues - 1;  J >= 0;  --J) {
            if (buttonValue == valueArry[J]) {
                valIndex    = J;
                break;
            }
        }
        valIndex++;
        if (valIndex >= numValues)
            valIndex    = 0;

        buttonValue     = valueArry[valIndex];

        storeValue ();
        setButtonTextAndVal ();
    };


    //***** Private functions:
    function fetchValue () {
        buttonValue     = GM_getValue (setValName, buttonValue);
    }

    function storeValue () {
        GM_setValue (setValName, buttonValue);
    }

    function setButtonTextAndVal () {
        var buttonText  = "*ERROR!*";

        for (var J = valueArry.length - 1;  J >= 0;  --J) {
            if (buttonValue == valueArry[J]) {
                buttonText  = textArry[J];
                break;
            }
        }

        var theBtn      = document.getElementById (htmlID);
        if (theBtn) {
            theBtn.textContent  = buttonText;
            theBtn.setAttribute ("value", buttonValue);
        }
        else
            alert ('Missing persistent button with ID: ' + htmlID + '!');
    }
}
