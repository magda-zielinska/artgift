import { IntlShape } from "gatsby-plugin-intl"
import { padStart } from 'lodash';

export function formatDate(dateS: string, intl: IntlShape) {
    let y = +dateS.substring(0, 4)
    let m = +dateS.substring(4, 6)
    let d = +dateS.substring(6, 8)
    let date = new Date(y, m - 1, d)
    let dayOfWeek = intl.formatMessage({ id: `dayOfWeek${date.getDay()}` })
    return `${dayOfWeek} ${d}.${m}.`
}

export function formatTime(time: string) {
    let [hours, minutes] = time.split(":").map(t => +t)
    let h = hours < 10 ? `0${hours}` : `${hours}`
    let m = minutes < 10 ? `0${minutes}` : `${minutes}`
    return `${h}:${m}`
}


export function formatDuration(dur: number) {
    let minutes = Math.floor(dur / (60 * 1000))
    let seconds = Math.floor((dur - minutes * 60 * 1000) / 1000)
    return `${padStart('' + minutes, 2, '0')}:${padStart('' + seconds, 2, '0')}`
}