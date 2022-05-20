import { readFileSync } from "node:fs"
import { createInterface } from "node:readline"
import axios, { Axios } from "axios"
const rl = createInterface(process.stdin, process.stderr)
const question = (text: string) => new Promise<string>(resolve => rl.question(text, resolve))
const ids = readFileSync(process.argv[2], "ascii").split(",").map(a => a.trim()).filter(a => a.length)

async function main() {
    const token = await question("YouTube Data API Token (with Bearer header): ")
    const playlistId = process.argv[3].trim()
    for (const videoId of ids) {
        if (videoId.length !== 11) throw new Error("invalid video id: " + videoId)
        const body = {
            snippet: {
                playlistId,
                resourceId: {
                    kind: "youtube#video",
                    videoId,
                }
            }
        }
        console.log(body)
        await axios.post("https://content-youtube.googleapis.com/youtube/v3/playlistItems?alt=json&part=snippet", JSON.stringify(body), {
            headers: {
                "Authorization": token,
                "Content-Type": "application/json",
            },
        })
    }
    console.log("finish")
    process.exit(0)
}

main().catch(e => {
    if (axios.isAxiosError(e)) {
        console.log(e.message)
        console.log(JSON.stringify(e.response?.data))
    } else {
        console.error(e)
    }
    process.exit(1)
})