import React, { useMemo, useEffect, useState, useCallback } from "react";
import firebase from "firebase/app";
import { groupBy } from "lodash";

import { Navigation } from "./Navigation";
import { Gift, Slot } from "./types";
import { formatDate, formatTime } from "./util/dateUtils";

export const Gifts: React.FC = () => {
  let giftColl = useMemo(() => firebase.firestore().collection("gifts"), []);
  let slotColl = useMemo(() => firebase.firestore().collection("slots"), []);

  let [gifts, setGifts] = useState<Gift[]>([]);
  let [slots, setSlots] = useState<Slot[]>([]);
  let [showingDetails, setShowingDetails] = useState<{
    [giftId: string]: boolean;
  }>({});

  useEffect(() => {
    let unSub = giftColl.onSnapshot((giftsSnapshot) => {
      setGifts(
        giftsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Gift))
      );
    });
    return () => {
      unSub();
    };
  }, [giftColl]);
  useEffect(() => {
    let unSub = slotColl.onSnapshot((slotsSnapshot) => {
      setSlots(
        slotsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Slot))
      );
    });
    return () => {
      unSub();
    };
  }, [slotColl]);

  let getTableData = () => {
    if (gifts.length === 0 || slots.length === 0) return [];
    let slotsById = groupBy(slots, (s) => s.id);
    return gifts.map((gift) => ({
      gift,
      slot: slotsById[gift.slotId!][0] as Slot,
    }));
  };

  let onToggleDetails = useCallback((gift: Gift) => {
    setShowingDetails((d) => ({ ...d, [gift.id!]: !d[gift.id!] }));
  }, []);

  let onDeleteGift = useCallback(
    (gift: Gift) => {
      if (window.confirm("Are you sure you want to delete this gift?")) {
        giftColl.doc(gift.id).delete();
      }
    },
    [giftColl]
  );

  return (
    <div className="slots">
      <Navigation currentPage="gifts" />
      <table className="slots--list">
        <thead></thead>
        <tbody>
          {getTableData().map(({ gift, slot }) => (
            <React.Fragment key={gift.id}>
              <tr onClick={() => onToggleDetails(gift)}>
                <td>{formatDate(slot.date)}</td>{" "}
                <td>{formatTime(slot.time)}</td> <td>{slot.region}</td>
                <td>{gift.toAddress}</td>
                <td>{gift.fromEmail}</td>
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
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
