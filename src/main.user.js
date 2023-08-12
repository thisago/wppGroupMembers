// ==UserScript==
// @name        WhatsApp Group Members Extractor
// @namespace   Violentmonkey Scripts
// @match       https://web.whatsapp.com/*
// @grant       none
// @version     1.0.0
// @author      Thiago Navarro
// @description Extracts all group members by just pressing `F2` with a open group in Whatsapp web!
// @downloadURL https://git.ozzuu.com/thisago/wppGroupMembers/raw/branch/master/src/main.user.js
// ==/UserScript==

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
  check = (el) => el != null,
  checkInterval = 1000,
  limit = 30
) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (limit == 0) {
        clearInterval(interval)
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
    const openGroupInfoEl = document.querySelector("._2au8k")

    if (!openGroupInfoEl) {
      reject("Button to open group info not found.")
      return
    }
    openGroupInfoEl.click()

    const openGroupParticipantsSel = ".q1n4p668"
    const groupParticipantsSel = "div.thghmljt:nth-child(3)"

    const openGroupParticipantsEl = await waitEl(
      document,
      openGroupParticipantsSel
    )

    openGroupParticipantsEl.click()

    const groupParticipantsEl = await waitEl(document, groupParticipantsSel)
    const membersListEl = groupParticipantsEl.querySelector("._3YS_f._2A1R8")

    let members = []
    var remainingScrolls = -1 // infinite
    const pageSizeSubtract = 20
    const pageSize = groupParticipantsEl.clientHeight - pageSizeSubtract

    groupParticipantsEl.scrollTop = 0 // reset scroll
    var stop = false
    while (!stop && remainingScrolls != 0) {
      stop = !(
        groupParticipantsEl.scrollTop <
        groupParticipantsEl.scrollHeight - (pageSize + pageSizeSubtract)
      )
      await waitEl(groupParticipantsEl, ".cw3vfol9._11JPr")
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
    resolve(dedupMembers(members))
  })
}

/**
 * Converts json members to csv
 *
 * @param {Array<Object>} members
 * @returns string
 */
function toCsv(members) {
  let csv = "phone,name,bio,avatar,role\n"
  members.map((member) => {
    if (!member.phone) return
    csv += `"${member.phone}","${member.name}","${member.bio}","${member.avatar}","${member.role}"\n`
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
document.addEventListener("keydown", async (ev) => {
  if (ev.key == "F2") {
    if (processing) {
      alert("Please wait the finish of previous extraction.")
      return
    }
    processing = true
    try {
      const members = await getMembers()
      download(toCsv(members))
      processing = false
    } catch (err) {
      alert(err)
    }
  }
})
