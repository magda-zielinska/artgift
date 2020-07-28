import React, { useMemo, useEffect, useState, useCallback } from "react";
import firebase from "firebase/app";
import { groupBy, fromPairs, flatMap } from "lodash";
import classNames from "classnames";
import { ExportToCsv } from "export-to-csv";

import { Navigation } from "./Navigation";
import { Gift, Slot, Artist } from "./types";
import { formatDate, formatTime } from "./util/dateUtils";
import { MAIN_APP_HOST } from "./constants";

import "./Gifts.scss";

export const Gifts: React.FC = () => {
  let giftColl = useMemo(() => firebase.firestore().collection("gifts"), []);
  let slotColl = useMemo(() => firebase.firestore().collection("slots"), []);
  let artistColl = useMemo(
    () => firebase.firestore().collection("artists"),
    []
  );
  let csvExporter = useMemo(
    () => new ExportToCsv({ title: `Art Gifts`, useKeysAsHeaders: true }),
    []
  );

  let [gifts, setGifts] = useState<Gift[]>([]);
  let [slots, setSlots] = useState<Slot[]>([]);
  let [artistAssignments, setArtistAssignments] = useState<{
    [giftId: string]: string;
  }>({});

  let [showingDetails, setShowingDetails] = useState<{
    [giftId: string]: boolean;
  }>({});

  useEffect(() => {
    let unSub = giftColl
      .where("status", "in", ["pending", "confirmed", "rejected", "cancelled"])
      .onSnapshot((giftsSnapshot) => {
        setGifts(
          giftsSnapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Gift))
        );
      });
    return () => {
      unSub();
    };
  }, [giftColl]);
  useEffect(() => {
    let unSub = slotColl.onSnapshot((slotsSnapshot) => {
      setSlots(
        slotsSnapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Slot))
      );
    });
    return () => {
      unSub();
    };
  }, [slotColl]);
  useEffect(() => {
    let unSub = artistColl.orderBy("name").onSnapshot((artistsSnapshot) => {
      let artists = artistsSnapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Artist)
      );
      setArtistAssignments(
        fromPairs(
          flatMap(artists, (artist) =>
            flatMap(artist.itineraries, (it) =>
              it.assignments.map((a) => [a.giftId, artist.name])
            )
          )
        )
      );
    });
    return () => {
      unSub();
    };
  }, [artistColl]);

  let getTableData = useCallback(() => {
    if (gifts.length === 0 || slots.length === 0) return [];
    let slotsById = groupBy(slots, (s) => s.id);
    return gifts.map((gift) => ({
      gift,
      slot: slotsById[gift.slotId!]?.[0] as Slot,
      assignedArtist: artistAssignments[gift.id],
    }));
  }, [gifts, slots, artistAssignments]);

  let onToggleDetails = useCallback((gift: Gift) => {
    setShowingDetails((d) => ({ ...d, [gift.id!]: !d[gift.id!] }));
  }, []);

  let onUpdateGiftStatus = useCallback(
    (
      gift: Gift,
      toStatus: "confirmed" | "rejected",
      event: React.MouseEvent
    ) => {
      if (
        window.confirm(
          toStatus === "confirmed"
            ? "Are you sure you want to confirm this gift, and send the gift giver a confirmation message?"
            : "Are you sure you want to reject this gift, and send the gift giver a rejection message?"
        )
      ) {
        giftColl.doc(gift.id).set({ status: toStatus }, { merge: true });
      }
      event.stopPropagation();
    },
    [giftColl]
  );

  let onDeleteGift = useCallback(
    (gift: Gift) => {
      if (
        window.confirm(
          "Are you sure you want to delete this gift? This action is permanent and the gift giver will NOT be notified"
        )
      ) {
        giftColl.doc(gift.id).delete();
      }
    },
    [giftColl]
  );

  let onExportCSV = useCallback(() => {
    csvExporter.generateCsv(
      getTableData().map(({ gift, slot, assignedArtist }) => ({
        giftId: gift.id,
        slotId: slot.id,
        date: slot && formatDate(slot.date),
        time: slot && formatTime(slot.time),
        region: slot?.region,
        toName: gift.toName,
        toAddress: gift.toAddress,
        toLanguage: gift.toLanguage,
        reason: gift.toSignificance,
        fromName: gift.fromName,
        fromEmail: gift.fromEmail,
        fromPhoneNumber: gift.fromPhoneNumber,
        message: gift.fromMessage,
        photographyPermission: gift.fromPhotographyPermissionGiven || false,
        status: gift.status,
        assignedArtist: assignedArtist || "",
        cancellationReason: gift.cancellationReason || "",
      }))
    );
  }, [getTableData, csvExporter]);

  return (
    <div className="gifts">
      <Navigation currentPage="gifts" />
      <table className="gifts--list">
        <thead></thead>
        <tbody>
          {getTableData().map(({ gift, slot, assignedArtist }) => (
            <React.Fragment key={gift.id}>
              <tr onClick={() => onToggleDetails(gift)}>
                <td>{slot && formatDate(slot.date)}</td>
                <td>{slot && formatTime(slot.time)}</td>
                <td>{slot?.region}</td>
                <td>{gift.toAddress}</td>
                <td>{gift.fromEmail}</td>
                <td>
                  <span
                    className={classNames(
                      "giftStatus",
                      gift.status || "pending"
                    )}
                  >
                    {gift.status || "pending"}
                  </span>
                </td>
                <td>
                  <span
                    className={classNames(
                      "giftArtistStatus",
                      assignedArtist ? "assigned" : "unassigned"
                    )}
                  >
                    {gift.status === "confirmed"
                      ? assignedArtist || "no artist"
                      : ""}
                  </span>
                </td>
                <td>
                  {gift.status !== "confirmed" &&
                    gift.status !== "rejected" &&
                    gift.status !== "cancelled" && (
                      <button
                        onClick={(evt) =>
                          onUpdateGiftStatus(gift, "confirmed", evt)
                        }
                      >
                        Confirm
                      </button>
                    )}
                  {gift.status !== "rejected" &&
                    gift.status !== "cancelled" && (
                      <button
                        onClick={(evt) =>
                          onUpdateGiftStatus(gift, "rejected", evt)
                        }
                      >
                        Reject
                      </button>
                    )}
                </td>
                <td>
                  <button onClick={() => onDeleteGift(gift)}>Delete</button>
                </td>
              </tr>
              {showingDetails[gift.id] && (
                <tr>
                  <td></td>
                  <td></td>
                  <td colSpan={4}>
                    <table>
                      <thead></thead>
                      <tbody>
                        <tr>
                          <td>From:</td>
                          <td>
                            {gift.fromName} &lt;{gift.fromEmail}&gt;{" / "}
                            {gift.fromPhoneNumber}
                          </td>
                        </tr>
                        <tr>
                          <td>To:</td>
                          <td>{gift.toName}</td>
                        </tr>
                        <tr>
                          <td>Language:</td>
                          <td>{gift.toLanguage} </td>
                        </tr>
                        <tr>
                          <td>Location:</td>
                          <td>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${gift.toLocation?.point[1]},${gift.toLocation?.point[0]}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {gift.toAddress}
                            </a>
                          </td>
                        </tr>
                        <tr>
                          <td>Reason:</td>
                          <td>{gift.toSignificance}</td>
                        </tr>
                        <tr>
                          <td>Notes:</td>
                          <td>{gift.fromMessage}</td>
                        </tr>
                        <tr>
                          <td>Permission to photograph:</td>
                          <td>
                            {gift.fromPhotographyPermissionGiven ? "yes" : "no"}
                          </td>
                        </tr>
                        <tr>
                          <td>App link:</td>
                          <td>
                            <a
                              href={`${MAIN_APP_HOST}/gift?id=${gift.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {`${MAIN_APP_HOST}/gift?id=${gift.id}`}
                            </a>
                          </td>
                        </tr>
                        {gift.status === "cancelled" && (
                          <tr>
                            <td>Cancellation reason:</td>
                            <td>{gift.cancellationReason}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <button onClick={onExportCSV}>Export as CSV</button>
    </div>
  );
};
