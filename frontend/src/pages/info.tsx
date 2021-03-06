import React, { useState, useEffect, useContext, useMemo } from "react"
import Helmet from "react-helmet"
import { useIntl } from "gatsby-plugin-intl"
import { PageProps } from "gatsby"
import classNames from "classnames"
import { useWindowWidth } from "@react-hook/window-size"
import { groupBy, fromPairs, toPairs, sumBy } from "lodash"

import Layout from "../components/layout"
import SEO from "../components/seo"
import NextButton from "../components/nextButton"
import BackButton from "../components/backButton"

import { useMapBackground } from "../../plugins/gatsby-plugin-map-background/hooks"
import { MapBackgroundContext } from "../../plugins/gatsby-plugin-map-background/mapBackgroundContext"
import { initGift, subscribeToGiftSlotsOverview } from "../services/gifts"

import { useMounted, useGiftState } from "../hooks"

import "./info.scss"
import {
  getRandomLocationsForVisualisation,
  getRegionGeoJSON,
  getWholeRegionBounds,
} from "../services/regionLookup"

const InfoPage: React.FC<PageProps> = () => {
  let mounted = useMounted()
  let intl = useIntl()
  let windowWidth = useWindowWidth()
  let regions = useMemo(() => getRegionGeoJSON(), [])

  let mapContext = useContext(MapBackgroundContext)
  let { isMoving: isMapMoving } = useMapBackground({
    bounds: getWholeRegionBounds(),
    boundsPadding: windowWidth < 768 ? 0 : 150,
  })
  let [attendanceAccepted, setAttendanceAccepted] = useState(false)
  let [gdprAccepted, setGdprAccepted] = useState(false)
  let [gift, setGift] = useGiftState(initGift(intl.locale))

  useEffect(() => {
    let unSubSlots = subscribeToGiftSlotsOverview(giftSlots => {
      let availableSlots = giftSlots.filter(s => s.status !== "reserved")
      let slotsByRegion = groupBy(giftSlots, s => s.region)
      let availabilityByRegion = fromPairs(
        toPairs(slotsByRegion).map(([region, slots]) => [
          region,
          sumBy(slots, slot => (slot.status !== "reserved" ? 1 : 0)),
        ])
      )
      mapContext.update({
        points: getRandomLocationsForVisualisation(availableSlots),
        regions: regions
          .filter(r => !availabilityByRegion[r.name])
          .map(r => ({ ...r, status: "unavailable" })),
      })
    })
    return () => {
      unSubSlots()
    }
  }, [regions])

  return (
    <Layout>
      <SEO
        title={intl.formatMessage({ id: "infoSEOTitle" })}
        description={intl.formatMessage({ id: "infoSEODescription" })}
      />
      <Helmet
        bodyAttributes={{
          class: "info",
        }}
        key="helmet"
      />
      <main
        className={classNames("main", {
          isVisible: mounted && !isMapMoving,
        })}
      >
        <div className="scroll">
          <h1>{intl.formatMessage({ id: "infoTitle" })}</h1>
          <p>{intl.formatMessage({ id: "infoDescription" })}</p>
          <div className="checkboxes">
            <div className="inputGroup">
              <div className="inputCheckbox">
                <input
                  type="checkbox"
                  id="infoRequirementAttendance"
                  checked={attendanceAccepted}
                  onChange={evt => setAttendanceAccepted(evt.target.checked)}
                />
                <label htmlFor="infoRequirementAttendance">
                  {intl.formatMessage({ id: "infoRequirementAttendance" })}{" "}
                  <span className="requiredField">*</span>
                </label>
              </div>
            </div>
            <div className="inputGroup">
              <div className="inputCheckbox">
                <input
                  type="checkbox"
                  id="infoRequirementGDPR"
                  checked={gdprAccepted}
                  onChange={evt => setGdprAccepted(evt.target.checked)}
                />
                <label htmlFor="infoRequirementGDPR">
                  {intl.formatMessage({ id: "infoRequirementGDPR" })}{" "}
                  <span className="requiredField">*</span>
                </label>
              </div>
            </div>
            <div className="inputGroup">
              <div className="inputCheckbox">
                <input
                  type="checkbox"
                  id="infoRequirementMarketing"
                  checked={gift.fromPhotographyPermissionGiven}
                  onChange={evt =>
                    setGift({
                      ...gift,
                      fromPhotographyPermissionGiven: evt.target.checked,
                    })
                  }
                />
                <label htmlFor="infoRequirementMarketing">
                  {intl.formatMessage({ id: "infoRequirementMarketing" })}{" "}
                </label>
              </div>
            </div>
          </div>
          <NextButton
            to="/to"
            text={intl.formatMessage({ id: "infoButtonNext" })}
            disabled={!attendanceAccepted || !gdprAccepted}
          />
          <BackButton to="/" text={intl.formatMessage({ id: "backButton" })} />
        </div>
      </main>
    </Layout>
  )
}

export default InfoPage
