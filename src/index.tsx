import { z, ZodLiteral } from "zod"
import { load } from "js-yaml"
import { readFileSync, writeFileSync } from "fs"
import { renderToStaticMarkup } from "react-dom/server"
import React from "react"

const spot_groups = [
    "CINDERELLA GIRLS",
    "STARLIGHT STAGE",
    "Solo Tracks",
    "from Animation",
    "ReArrange&ReMix",
] as const

type ForceTreatedAsTwoOrMore<T> = [T, T, ...T[]]

const data = z.object({
    title: z.string(),
    description: z.string(),
    sections: z.array(z.object({
        id: z.string(),
        title: z.string(),
        description: z.optional(z.string()),
        needs_not_spot_release: z.optional(z.literal(true)),
        needs_digital_release: z.optional(z.literal(true)),
        needs_spot_group: z.optional(z.literal(true)),
        songs: z.array(z.object({
            title: z.string(),
            description: z.string(),
            links: z.array(z.union([
                z.object({
                    youtube: z.string(),
                    unofficial: z.boolean(),
                    text: z.string(),
                }),
                z.object({
                    ototoy: z.number(),
                    hi_res: z.optional(z.literal(true)),
                }),
                z.object({
                    mb_rg: z.string(),
                }),
                z.object({
                    mb_recording: z.string(),
                }),
                z.object({
                    mb_work: z.string(),
                }),
                z.object({
                    spot_group: z.union(spot_groups.map(s => z.literal(s)) as any as ForceTreatedAsTwoOrMore<ZodLiteral<typeof spot_groups[number]>>),
                    stage_commu: z.optional(z.number()),
                    stage_purchase: z.optional(z.literal(true)),
                }),
            ])),
        })),
    })),
}).parse(load(readFileSync(__dirname+"/../data.yaml", { encoding: "utf-8" })))

writeFileSync(__dirname+"/../youtube-id.official-only.txt", data.sections.flatMap(section => section.songs).map(song => {
    for (const link of song.links) {
        if ("youtube" in link) return link
    }
}).filter(y => y?.unofficial === false).map(y => y!.youtube).join(","))
writeFileSync(__dirname+"/../youtube-id.including-unofficial.txt", data.sections.flatMap(section => section.songs).map(song => {
    for (const link of song.links) {
        if ("youtube" in link) return link
    }
}).filter(y => y != null).map(y => y!.youtube).join(","))

const css = `
dt > .title {
    font-weight: bold;
}
.unofficial {
    opacity: 0.333;
}
del {
    opacity: 0.25;
    font-size: 0.75em;
}

dd > ul {
    margin-top: 0.5em;
    padding-inline-start: 16px;
}

/* Firefox 早く :has 対応してくれ */
input#hide-otaku-message:checked ~ section > dl p.otaku-message {
    display: none;
}
`.trim()

let html = `<!DOCTYPE html>\n`
html += renderToStaticMarkup(<html lang="ja">
    <head>
        <meta charSet="UTF-8" />
        <title>{data.title}</title>
        <style dangerouslySetInnerHTML={{__html: css}}/>
        <meta name="generator" content="https://github.com/rinsuki-lab/good-cinderella-songs w/ React" />
    </head>
    <body>
        <h1>{data.title}</h1>
        <p dangerouslySetInnerHTML={{__html: data.description}}></p>
        <input type="checkbox" id="hide-otaku-message" /><label htmlFor="hide-otaku-message">オタクの語彙力のない説明文を隠す</label>
        <h2>目次 (合計{data.sections.reduce((c, s) => c + s.songs.length, 0)}曲)</h2>
        <ul>
            {data.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title} ({section.songs.length}曲)</a></li>)}
        </ul>
        {data.sections.map(section => <section id={section.id}>
            <h2>{section.title}</h2>
            {section.description && <p dangerouslySetInnerHTML={{__html: section.description}} />}
            <dl>
                {...section.songs.map(song => {
                    // validations
                    if (section.needs_not_spot_release && null == song.links.find(l => "mb_rg" in l || "mb_recording" in l)) throw new Error(`mb_rg is missing in ${song.title}`)
                    if (section.needs_digital_release && null == song.links.find(l => "ototoy" in l)) throw new Error(`ototoy is missing in ${song.title}`)
                    if (section.needs_spot_group && null == song.links.find(l => "spot_group" in l) && song.title !== "Stage Bye Stage") throw new Error(`spot_group is missing in ${song.title}`)
                    if (null == song.links.find(l => "mb_work" in l)) throw new Error(`mb work is missing in ${song.title}`)
                    if (null == song.links.find(l => "youtube" in l) && song.title !== "Stage Bye Stage (デレステイベント版)") throw new Error(`youtube is missing in ${song.title}`)
                    song.links.forEach(link => {
                        if ("spot_group" in link && link.spot_group === "Solo Tracks" && link.stage_commu == null && link.stage_purchase == null) throw new Error(`solo but commu and purchase data is missing in ${song.title}`)
                    })
                    return <>
                        <dt data-links={JSON.stringify(song.links)}><span className="title">{song.title}</span></dt>
                        <dd>
                            <ul>
                                {
                                song.links.map(link => {
                                    if ("youtube" in link) {
                                        return <a href={`https://www.youtube.com/watch?v=${link.youtube}`} className={link.unofficial ? "unofficial" : undefined}>YouTube {link.text}</a>
                                    } else if ("mb_work" in link) {
                                        return <a href={`https://musicbrainz.org/work/${link.mb_work}`}>MB: Work</a>
                                    } else if ("mb_rg" in link) {
                                        return <a href={`https://musicbrainz.org/release-group/${link.mb_rg}`}>MB: Release Group</a>
                                    } else if ("mb_recording" in link) {
                                        return <a href={`https://musicbrainz.org/recording/${link.mb_recording}`}>MB: Recording</a>
                                    } else if ("ototoy" in link) {
                                        return <a href={`https://ototoy.jp/_/default/p/${link.ototoy}`}>OTOTOY 配信{link.hi_res && " (ハイレゾ)"}</a>
                                    } else if ("spot_group" in link) {
                                        let text = `デレスポ「${link.spot_group}」内`
                                        if (link.stage_commu) {
                                            text += ` (デレステ: ストーリーコミュ${link.stage_commu}話)`
                                        }
                                        if (link.stage_purchase) {
                                            text += ` (デレステ: サウンドブースでの購入で開放)`
                                        }
                                        return text
                                    }
                                }).map((dom, i, arr) => {
                                    return <li>{dom}</li>
                                })
                            }
                            </ul>
                            <p className="otaku-message" dangerouslySetInnerHTML={{__html: song.description}}/>
                        </dd>
                    </>
                })}
            </dl>
        </section>)}
        <hr />
        このHTMLはYAMLで書いたデータからスクリプトで生成しました。<a href="https://github.com/rinsuki-lab/good-cinderella-songs">詳しくは GitHub を見てください</a>。
    </body>
</html>)

writeFileSync(`${__dirname}/../generated.html`, html)