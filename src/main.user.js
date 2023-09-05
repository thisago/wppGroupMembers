// ==UserScript==
// @name        WhatsApp Group Members Extractor
// @namespace   Violentmonkey Scripts
// @match       https://web.whatsapp.com/*
// @grant       GM_registerMenuCommand
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addValueChangeListener
// @version     1.3.1
// @author      Thiago Navarro
// @run-at      document-end
// @description Extracts all group members by just pressing `F2` with a open group in WhatsApp web!
// @downloadURL https://git.ozzuu.com/thisago/wppGroupMembers/raw/branch/master/src/main.user.js
// ==/UserScript==

const pmConfigValueKey = "pmConfig"
const pmSentKey = "pmSent"

function clearPmTasks() {
  GM_setValue(pmConfigValueKey, "")
  GM_setValue(pmSentKey, false)
}

let panicStop = false
function ifPanicStop() {
  if (panicStop) {
    console.log("Panic stop")
    return true
  }
  return false
}

/**
 * Simulates a human-like click interaction on an element using mouse events.
 *
 * Generated by ChatGPT
 *
 * @param {HTMLElement} element - The element to be clicked.
 * @param {number} minDelay - The minimum delay before the click (in milliseconds).
 * @param {number} maxDelay - The maximum delay before the click (in milliseconds).
 */
async function simulateHumanLikeClick(element, minDelay = 200, maxDelay = 300) {
  if (element) {
    const randomDelay1 = Math.random() * (maxDelay - minDelay) + minDelay
    const randomDelay2 = Math.random() * (maxDelay - minDelay) + minDelay

    const clickX = element.getBoundingClientRect().left + Math.random() * 20 + 5
    const clickY = element.getBoundingClientRect().top + Math.random() * 20 + 5

    await sleep(randomDelay1)

    element.dispatchEvent(
      new MouseEvent("mouseover", {
        bubbles: true,
        cancelable: true,
        view: unsafeWindow,
      })
    )

    await sleep(randomDelay2)

    element.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: unsafeWindow,
        clientX: clickX,
        clientY: clickY,
      })
    )

    await sleep(randomDelay1 + randomDelay2 / 3)

    element.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        view: unsafeWindow,
        clientX: clickX,
        clientY: clickY,
      })
    )
  } else {
    console.log("Element not found")
  }
}

/**
 * Simulates text entry and interaction on a specified element.
 *
 * Generated by ChatGPT (after a lot of work)
 *
 * @param {HTMLElement} element - The target element to simulate text entry on.
 * @param {string} newText - The text to be typed into the element.
 * @param {number} delay - Optional delay between character entries (in milliseconds). Randomized
 */
async function simulateTextEntry(element, newText, delay = 200) {
  // Simulate mouse click to focus
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }))

  // Wait for focus to occur
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Loop through each character in newText
  for (const char of newText) {
    console.log("Pressing key: ", char)
    // Simulate keypress event
    const keyDownEvent = new KeyboardEvent("keydown", {
      key: char,
      bubbles: true,
    })
    const keyPressEvent = new KeyboardEvent("keypress", {
      key: char,
      bubbles: true,
    })
    const keyUpEvent = new KeyboardEvent("keyup", { key: char, bubbles: true })

    element.dispatchEvent(keyDownEvent)
    element.dispatchEvent(keyPressEvent)
    element.dispatchEvent(keyUpEvent)

    // Simulate input event
    const inputEvent = new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: char,
    })
    element.dispatchEvent(inputEvent)

    // Insert the character using execCommand
    document.execCommand("insertText", false, char)

    // Wait before proceeding to the next character
    await sleep(delay / 2 + (Math.random() * delay) / 2)
  }

  // Simulate blur event to remove focus
  const blurEvent = new FocusEvent("blur", { bubbles: true })
  element.dispatchEvent(blurEvent)

  console.log("Text entry simulation completed")
}

/**
 * Waits to user clear a contenteditable element.
 *
 * If the element's content is already empty, the promise resolves immediately.
 * If the content is not empty, an alert is shown to the user, and the function
 * keeps checking until the content is cleared. Once cleared, the promise resolves.
 *
 * @param {HTMLElement} element - The contenteditable element to clear.
 * @returns {Promise<void>} A promise that resolves when the element's content is successfully cleared.
 */
function waitClearContentEditable(element, doAlert = true) {
  return new Promise((resolve, reject) => {
    // If the content is already empty, resolve immediately
    if (element.innerText.trim().length == 0) {
      resolve()
      return
    }

    if (doAlert)
      // Alert user to manually clear the input
      alert(
        "Please clear the text input, currently I can't clear it automatically :("
      )

    // Periodically check if content is cleared and resolve the promise
    const interval = setInterval(() => {
      if (element.innerText.trim().length == 0) {
        clearInterval(interval)
        resolve()
      }
    }, 1000)
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Waits a element
 *
 * @param {Element} baseEl Element to run querySelector
 * @param {string} selector CSS element selector
 * @param {Function} check Check if can run `cb`
 * @param {number} checkInterval Time in ms to check if element exists
 * @param {number} limit Max checks
 *
 * @returns {Promise<Element>}
 */
function waitEl(
  baseEl,
  selector,
  limit = 30,
  check = (el) => el != null,
  checkInterval = 1000
) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (limit == 0 || panicStop) {
        clearInterval(interval)
        if (ifPanicStop()) return
        reject(`Cannot find "${selector}", tries limit reached.`)
        return
      }
      let el = baseEl.querySelector(selector)
      if (check(el)) {
        clearInterval(interval)
        resolve(el)
      }
      limit--
    }, checkInterval)
  })
}

const clickElement =
  (sel, container = document, limit = 30, event = false) =>
  async () => {
    let btn = await waitEl(container, sel, limit)
    if (event) simulateHumanLikeClick(btn)
    else btn.click()
  }

;(async () => {
  // try send message

  try {
    const config = JSON.parse(GM_getValue(pmConfigValueKey))
    console.log("Message will be sent. Please wait.")

    GM_registerMenuCommand("Clear PM tasks", clearPmTasks, "s")

    const messageBox = await waitEl(
      document,
      "._3Uu1_ > div:nth-child(1) > div:nth-child(1)",
      100
    )

    if (config.type == "text") {
      await waitClearContentEditable(messageBox)
      await simulateTextEntry(messageBox, config.textMsg)

      await sleep(500)

      const sendButton = await waitEl(document, "button.tvf2evcx", 100)
      sendButton.click()

      await waitClearContentEditable(messageBox, false)

      GM_setValue(pmSentKey, true)
    } else if (config.type == "img") {
      alert("Image sending not implemented yet")
    }

    window.close()
    return
  } catch (e) {
    console.log("No available PM's to be sent", e)
  }

  /**
   * Remove duplicated numbers
   *
   * @param {Array<Object>} members
   * @returns {Array<Object>}
   */
  function dedupMembers(members) {
    const contains = (arr, item) => {
      for (const x of arr) if (x.phone == item.phone) return true

      return false
    }
    let result = []
    members.map((member) => {
      if (!contains(result, member)) result.push(member)
    })
    return result
  }

  /**
   * Automatically extract members from open group
   *
   * @returns {Promise<Array.>}
   */
  function getMembers(sleepBetweenScrollPages = 500) {
    return new Promise(async (resolve, reject) => {
      const openGroupInfoEl = document.querySelector(
        "._2au8k"
      )

      if (!openGroupInfoEl) {
        reject("Button to open group info not found.")
        return
      }

      openGroupInfoEl.click()

      const openGroupParticipantsSel = ".q1n4p668"
      const groupParticipantsSel = "div.thghmljt:nth-child(3)"

      try {
        const openGroupParticipantsEl = await waitEl(
          document,
          openGroupParticipantsSel
        )
        openGroupParticipantsEl.click()
      } catch {
        reject("Cannot find the element to open group participants")
        return
      }

      let groupParticipantsEl = null
      let membersListEl = null
      try {
        groupParticipantsEl = await waitEl(document, groupParticipantsSel)
        membersListEl = groupParticipantsEl.querySelector("._3YS_f._2A1R8")
      } catch {
        reject("Cannot find the group participants element")
        return
      }

      let members = []
      var remainingScrolls = -1 // infinite
      const pageSizeSubtract = 20
      const pageSize = groupParticipantsEl.clientHeight - pageSizeSubtract

      groupParticipantsEl.scrollTop = 0 // reset scroll
      var stop = false
      while (!stop && remainingScrolls != 0) {
        if (ifPanicStop()) break
        stop = !(
          groupParticipantsEl.scrollTop <
          groupParticipantsEl.scrollHeight - (pageSize + pageSizeSubtract)
        )
        try {
          await waitEl(groupParticipantsEl, ".cw3vfol9._11JPr", 100)
        } catch {
          reject("Cannot find the first user bio in participant list")
          break
        }
        ;[...membersListEl.children].forEach((memberEl) => {
          try {
            let member = {
              name:
                memberEl.querySelector(
                  ".ggj6brxn.gfz4du6o.r7fjleex.g0rxnol2.lhj4utae.le5p0ye3.l7jjieqr._11JPr"
                )?.innerText ?? "",
              bio:
                memberEl.querySelector(
                  ".cw3vfol9._11JPr.selectable-text.copyable-text"
                )?.innerText ?? "",
              avatar: memberEl.querySelector("img")?.src ?? "",
              phone: memberEl.querySelector("span._2h0YP")?.innerText ?? "",
              role: memberEl.querySelector("div.Dvjym")?.innerText ?? "",
            }
            if (!member.phone && member.name && member.name[0] == "+") {
              member.phone = member.name
              member.name = ""
            }
            if (member.role == member.phone) {
              member.role = ""
            }
            members.push(member)
          } catch (err) {
            console.log(err, memberEl)
          }
        })
        await sleep(sleepBetweenScrollPages)
        groupParticipantsEl.scrollTop += pageSize
        remainingScrolls--
      }

      await sleep(500)

      // close participants list
      document.querySelector("[aria-label=Close]").click()

      // resolve promise
      resolve(dedupMembers(members))
    })
  }

  /**
   * Converts json members to csv
   *
   * @param {Array<Object>} members
   * @returns string
   */
  function groupMembersToCsv(members) {
    let csv = "phone,name,bio,avatar,role\n"
    members.map((member) => {
      if (!member.phone) return
      csv += `"${member.phone}","${member.name}","${member.bio}","${member.avatar}","${member.role}"\n`
    })
    return csv
  }

  /**
   * Converts json members object to csv
   *
   * @param {Array<Object>} members
   * @returns string
   */
  function allGroupsMembersToCsv(members) {
    let csv = "group,phone,name,bio,avatar,role\n"
    Object.keys(members).map((group) => {
      members[group].map((member) => {
        if (!member.phone) return
        csv += `"${group}","${member.phone}","${member.name}","${member.bio}","${member.avatar}","${member.role}"\n`
      })
    })
    return csv
  }

  /**
   * Download text as blob
   *
   * @param {string} text
   * @param {string} mime
   * @param {string} filename
   */
  function download(text, mime = "text/plain", filename = "members.csv") {
    const blob = new Blob([text], {
      type: mime,
    })
    var link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    if (confirm("Want to download?")) {
      link.download = filename
    } else {
      link.target = "_blank"
    }
    link.click()
  }

  // trigger
  let processing = false
  async function extractThisGroup() {
    if (processing) {
      alert("Please wait the finish of previous extraction.")
      return
    }
    processing = true
    try {
      const members = await getMembers()
      download(groupMembersToCsv(members))
    } catch (err) {
      alert(err)
    }
    processing = false
  }

  async function extractAllGroups() {
    // Containing this string in subheader, it'll be identified as group ready to be extracted
    if (processing) {
      alert("Please wait the finish of previous extraction.")
      return
    }
    const groupIdentifierString = prompt(
      "Provide a string contained in group in subheader to check if it's a group or just a contact (If group contains Brazilian numbers, just confirm)",
      "+55"
    )
    if (!groupIdentifierString) {
      alert("No subheader string check, stopping")
      return
    }
    processing = true

    let members = {}

    for (const chat of document.querySelectorAll("._199zF._3j691._1KV7I")) {
      if (ifPanicStop()) break
      await simulateHumanLikeClick(chat)
      try {
        await waitEl(
          document,
          ".g4oj0cdv > span:nth-child(1)",
          15,
          (el) => {
            if (!el) return false
            if (
              el.innerText.indexOf("group") == -1 &&
              el.innerText.indexOf("is typing") == -1 &&
              el.innerText.indexOf(groupIdentifierString) == -1
            )
              return false

            return true
          },
          200
        )
        let groupName = chat.innerText.split("\n")[0].trim()
        console.log("it's a group: ", groupName)
        await sleep(500)
        try {
          members[groupName] = await getMembers()
        } catch (err) {
          if (!confirm(`Error: ${err}\n\nTry next group?`)) break
        }

        await sleep(1000)
      } catch {
        console.log("not group")
      }
    }
    console.log(members)
    download(allGroupsMembersToCsv(members))
    processing = false
  }

  function doPanicStop() {
    panicStop = true
    setTimeout(() => {
      processing = false
      panicStop = false
    }, 5000)
  }

  const phoneToWppUrl = (phone) =>
    `https://web.whatsapp.com/send/?phone=${phone.replace(
      /[^\d]/g,
      ""
    )}&text&type=phone_number&app_absent=0`

  const popupId = "wppGroup_popup"
  const deleteHtmlPopup = () => document.getElementById(popupId)?.remove()

  const pmPopupClass = "pmPopup"
  const htmlPopup = (element) => {
    deleteHtmlPopup()

    let popup = document.createElement("div")
    popup.id = popupId

    popup.style.padding = "1em"
    popup.style.position = "absolute"
    popup.style.top = "20%"
    popup.style.left = "50%"
    popup.style.transform = "translate(-50%, -50%)"
    popup.style.background = "#222e35"
    popup.style.zIndex = "99999"
    popup.style.borderRadius = "1em"
    popup.style.border = ".2em solid #111b21"
    popup.style.boxShadow = "0 0 2em white"

    popup.innerHTML = /*html*/ `
<style>
  .${pmPopupClass} .menu {
    display: flex;
    flex-direction: row; 
    justify-content: space-around;
    width: 100%;
  }
  .${pmPopupClass} .menu button {
    background: #ffffff90;
  }
  .${pmPopupClass} .menu .cancel {
    color: red important;
  }
  .hidden {
    display: none;
  }
  .${pmPopupClass} {
    display: flex;
    flex-direction: column; 
  }
  .${pmPopupClass} div {
    margin: 1em;
  }
  .${pmPopupClass} h1 {
    font-size: 2.5em;
    margin-bottom: 1em;
  }
</style>`
    popup.append(element)
    document.body.append(popup)
  }

  const pmPopupConfigId = "pmPopupConfig"
  const pmPopupConfig = () =>
    new Promise(async (resolve, reject) => {
      const popup = document.createElement("div")
      popup.innerHTML = /*html*/ `
<div class="${pmPopupClass}" id="${pmPopupConfigId}">
  <h1>PM Message</h1>
  <div class="msgType">
    <label>
      <input checked value="text" type="radio" name="msgType" />
      Text message
    </label>
    <label>
      <input value="img" type="radio" name="msgType" />
      Image
    </label>
  </div>
  <div class="textMsg">
    <textarea minlength="2" placeholder="Text Message" name="textMsg"></textarea>
  </div>
  <div class="imageMsg hidden">
    <input name="imageMsg" type="file" />
  </div>
  <div class="menu">
    <button class="cancel">Cancel</button>
    <button class="confirm">Confirm</button>
  </div>
</div>
`
      htmlPopup(popup)

      const textMsgDiv = document.querySelector(`#${pmPopupConfigId} .textMsg`)
      const imageMsgDiv = document.querySelector(
        `#${pmPopupConfigId} .imageMsg`
      )
      const typeRadios = document.getElementsByName("msgType")
      for (const radio of typeRadios)
        radio.oninput = () => {
          textMsgDiv.classList.toggle("hidden", radio.value != "text")
          imageMsgDiv.classList.toggle("hidden", radio.value != "img")
        }
      document.querySelector(`#${pmPopupConfigId} .cancel`).onclick = () => {
        reject()
        deleteHtmlPopup()
      }
      document.querySelector(`#${pmPopupConfigId} .confirm`).onclick = () => {
        resolve({
          type: typeRadios[0].value,
          textMsg: document.querySelector(`#${pmPopupConfigId} [name=textMsg]`)
            .value,
          imageMsg: document.querySelector(
            `#${pmPopupConfigId} [name=imageMsg]`
          ).files,
        })
        deleteHtmlPopup()
      }
    })

  const extractPhoneNumbers = (text) => [
    ...text.replace(/[^\dA-Za-z\+]/g, "").match(/\+[0-9]{6,16}/g),
  ]

  const pmPopupContactsId = "pmPopupContacts"
  const pmPopupContacts = () =>
    new Promise(async (resolve, reject) => {
      const popup = document.createElement("div")
      popup.innerHTML = /*html*/ `
<div class="${pmPopupClass}" id="${pmPopupContactsId}">
  <h1>Contact to PM Message</h1>
  <textarea placeholder="Contacts" name="contacts"></textarea>
  <div class="menu">
    <button class="cancel">Cancel</button>
    <button class="confirm">Confirm</button>
  </div>
</div>
`
      htmlPopup(popup)

      const textarea = document.querySelector(
        `#${pmPopupContactsId} [name=contacts]`
      )
      textarea.focus()
      textarea.onchange = () => {
        textarea.value = extractPhoneNumbers(textarea.value).join("\n")
      }
      document.querySelector(`#${pmPopupContactsId} .cancel`).onclick = () => {
        reject()
        deleteHtmlPopup()
      }
      document.querySelector(`#${pmPopupContactsId} .confirm`).onclick = () => {
        resolve(extractPhoneNumbers(textarea.value))
        deleteHtmlPopup()
      }
    })

  const openAttachments = clickElement(
    "._1OT67 > div:nth-child(1) > div:nth-child(1)"
  )
  const useWhatsAppHere = clickElement("button.emrlamx0:nth-child(2)")

  const openNewTab = (url) => {
    const a = document.createElement("a")
    a.href = url
    a.target = "_blank"
    a.click()
  }

  /**
   *
   * @param {string} phone Contact phone number
   * @param {object} config pmPopupConfig object
   */
  function sendToPhone(phone, config) {
    return new Promise(async (resolve, reject) => {
      GM_setValue(pmSentKey, false)
      GM_setValue(pmConfigValueKey, JSON.stringify(config))
      openNewTab(phoneToWppUrl(phone))
      const interval = setInterval(() => {
        GM_addValueChangeListener(
          pmConfigValueKey,
          async (valName, oldVal, newVal, remote) => {
            if (newVal == oldVal || newVal.length != 0) {
              GM_setValue(pmSentKey, false)
              reject("All non sent messages was cancelled.")
              return
            }
            clearInterval(interval)
            resolve()
            console.log("solved")
          }
        )
        GM_addValueChangeListener(
          pmSentKey,
          async (valName, oldVal, newVal, remote) => {
            if (newVal == oldVal) return
            clearInterval(interval)
            if (newVal) {
              GM_setValue(pmSentKey, false)
              resolve("Sent")
              return
            }
            reject()
          }
        )
      }, 1000)
    })
  }

  async function sendPms() {
    processing = true
    try {
      let contacts = await pmPopupContacts()
      let config = await pmPopupConfig()
      console.log(contacts, config)
      for (const contact of contacts) {
        await sendToPhone(contact, config)
        await sleep(1000)
      }
    } catch (e) {
      console.log("Cancelled", e)
    }
    clearPmTasks()
    useWhatsAppHere()
    processing = false
  }

  GM_registerMenuCommand("Extract this group", extractThisGroup, "g")
  GM_registerMenuCommand("Extract all groups", extractAllGroups, "a")
  GM_registerMenuCommand("Send PMs", sendPms, "a")
  GM_registerMenuCommand("Stop all actions", doPanicStop, "s")
})()
