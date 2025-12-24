import { create } from "zustand";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Collection, CollectionFormData } from "../types";

interface CollectionState {
  collections: Collection[];
  loading: boolean;
}

interface CollectionActions {
  setCollections: (collections: Collection[]) => void;
  setLoading: (loading: boolean) => void;
  fetchCollections: (userId: string) => Promise<void>;
  subscribeToCollections: (userId: string) => () => void;
  addCollection: (
    collectionData: CollectionFormData,
    userId: string
  ) => Promise<string>;
  updateCollection: (
    collectionId: string,
    collectionData: Partial<CollectionFormData>
  ) => Promise<void>;
  deleteCollection: (collectionId: string, userId: string) => Promise<void>;
  setPinned: (collectionId: string, isPinned: boolean) => Promise<void>;
}

export const useCollectionStore = create<CollectionState & CollectionActions>(
  (set, get) => ({
    // State
    collections: [],
    loading: true,

    // Actions
    setCollections: (collections) => set({ collections }),
    setLoading: (loading) => set({ loading }),

    // 컬렉션 목록 가져오기
    fetchCollections: async (userId: string) => {
      try {
        set({ loading: true });
        const q = query(
          collection(db, "collections"),
          where("userId", "==", userId)
        );

        const querySnapshot = await getDocs(q);
        const collectionList: Collection[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // createdAt과 updatedAt이 Timestamp 객체인지 문자열인지 확인
          const parseDate = (dateValue: any): Date => {
            if (!dateValue) return new Date();
            // Firestore Timestamp 객체인 경우
            if (dateValue.toDate && typeof dateValue.toDate === "function") {
              return dateValue.toDate();
            }
            // ISO 문자열인 경우
            if (typeof dateValue === "string") {
              return new Date(dateValue);
            }
            // 이미 Date 객체인 경우
            if (dateValue instanceof Date) {
              return dateValue;
            }
            return new Date();
          };
          
          collectionList.push({
            id: doc.id,
            name: data.name,
            icon: data.icon,
            description: data.description || "",
            userId: data.userId,
            createdAt: parseDate(data.createdAt),
            updatedAt: parseDate(data.updatedAt),
            parentId: data.parentId ?? null,
            isPinned: data.isPinned ?? false,
          });
        });

        // 클라이언트 측에서 핀된 컬렉션을 먼저, 그 다음 이름순으로 정렬
        collectionList.sort((a, b) => {
          // 핀된 컬렉션이 먼저 오도록 정렬
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          // 같은 핀 상태라면 이름순으로 정렬
          return a.name.localeCompare(b.name);
        });

        set({ collections: collectionList });
      } catch (error) {
        const err = error as { code?: string; message?: string };
        // 권한 오류는 조용히 무시 (로그아웃 중일 수 있음)
        if (
          err?.code === "permission-denied" ||
          err?.code === "unauthenticated"
        ) {
          // 권한 오류는 조용히 무시
          set({ collections: [] });
        } else {
          console.error("Error fetching collections:", error);
        }
      } finally {
        set({ loading: false });
      }
    },

    // 컬렉션 실시간 구독
    subscribeToCollections: (userId: string) => {
      const q = query(
        collection(db, "collections"),
        where("userId", "==", userId)
      );

      // createdAt과 updatedAt이 Timestamp 객체인지 문자열인지 확인하는 헬퍼 함수
      const parseDate = (dateValue: any): Date => {
        if (!dateValue) return new Date();
        // Firestore Timestamp 객체인 경우
        if (dateValue.toDate && typeof dateValue.toDate === "function") {
          return dateValue.toDate();
        }
        // ISO 문자열인 경우
        if (typeof dateValue === "string") {
          return new Date(dateValue);
        }
        // 이미 Date 객체인 경우
        if (dateValue instanceof Date) {
          return dateValue;
        }
        return new Date();
      };

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const collectionList: Collection[] = [];

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            collectionList.push({
              id: doc.id,
              name: data.name,
              icon: data.icon,
              description: data.description || "",
              userId: data.userId,
              createdAt: parseDate(data.createdAt),
              updatedAt: parseDate(data.updatedAt),
              parentId: data.parentId ?? null,
              isPinned: data.isPinned ?? false,
            });
          });

          // 클라이언트 측에서 핀된 컬렉션을 먼저, 그 다음 이름순으로 정렬
          collectionList.sort((a, b) => {
            // 핀된 컬렉션이 먼저 오도록 정렬
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            // 같은 핀 상태라면 이름순으로 정렬
            return a.name.localeCompare(b.name);
          });

          set({ collections: collectionList, loading: false });
        },
        (error) => {
          const err = error as { code?: string; message?: string };
          // 권한 오류는 조용히 무시 (로그아웃 중일 수 있음)
          if (
            err?.code === "permission-denied" ||
            err?.code === "unauthenticated"
          ) {
            // 권한 오류는 조용히 처리
            try {
              unsubscribe();
            } catch {
              // 리스너 정리 중 발생하는 에러는 무시
            }
            set({ collections: [] });
          } else {
            console.error("컬렉션 로딩 오류:", error);
          }
          set({ loading: false });
        }
      );

      return unsubscribe;
    },

    // 컬렉션 추가
    addCollection: async (
      collectionData: CollectionFormData,
      userId: string
    ) => {
      try {
        const docRef = await addDoc(collection(db, "collections"), {
          ...collectionData,
          description: collectionData.description || "",
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          parentId: collectionData.parentId ?? null,
          isPinned: collectionData.isPinned ?? false,
        });

        // 새로 추가된 컬렉션을 목록에 추가
        const newCollection: Collection = {
          id: docRef.id,
          ...collectionData,
          description: collectionData.description || "",
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: collectionData.parentId ?? null,
          isPinned: collectionData.isPinned ?? false,
        };

        set((state) => ({
          collections: [newCollection, ...state.collections],
        }));
        return docRef.id;
      } catch (error) {
        console.error("Error adding collection:", error);
        throw error;
      }
    },

    // 컬렉션 수정
    updateCollection: async (
      collectionId: string,
      collectionData: Partial<CollectionFormData>
    ) => {
      try {
        await updateDoc(doc(db, "collections", collectionId), {
          ...collectionData,
          updatedAt: serverTimestamp(),
        });

        set((state) => ({
          collections: state.collections.map((collection) =>
            collection.id === collectionId
              ? {
                  ...collection,
                  ...collectionData,
                  updatedAt: new Date(),
                }
              : collection
          ),
        }));
      } catch (error) {
        console.error("Error updating collection:", error);
        throw error;
      }
    },

    // 컬렉션 삭제
    deleteCollection: async (collectionId: string, userId: string) => {
      try {
        // 인증 상태 확인
        if (!userId) {
          throw new Error("User not authenticated");
        }

        // 1. 해당 컬렉션에 연결된 북마크들을 찾기
        const bookmarksQuery = query(
          collection(db, "bookmarks"),
          where("userId", "==", userId),
          where("collection", "==", collectionId)
        );
        const bookmarksSnapshot = await getDocs(bookmarksQuery);
        console.log("Found bookmarks to delete:", bookmarksSnapshot.size);

        // 2. 연결된 북마크들을 모두 삭제
        if (bookmarksSnapshot.size > 0) {
          const deletePromises = bookmarksSnapshot.docs.map(
            async (bookmarkDoc) => {
              const bookmarkRef = doc(db, "bookmarks", bookmarkDoc.id);
              await deleteDoc(bookmarkRef);
            }
          );

          // 3. 모든 북마크 삭제 완료 대기
          await Promise.all(deletePromises);
        }

        // 4. 컬렉션 삭제
        const collectionRef = doc(db, "collections", collectionId);
        await deleteDoc(collectionRef);

        // 5. 로컬 상태 업데이트
        set((state) => ({
          collections: state.collections.filter(
            (collection) => collection.id !== collectionId
          ),
        }));
      } catch (error) {
        console.error("Error deleting collection:", error);
        throw error;
      }
    },

    // 컬렉션 핀 설정 (하나만 가능)
    setPinned: async (collectionId: string, isPinned: boolean) => {
      try {
        const { collections } = get();
        const batch = [];

        if (isPinned) {
          // 새로운 컬렉션을 핀으로 설정할 때, 기존 핀된 컬렉션들을 모두 해제
          const currentPinnedCollections = collections.filter(
            (col) => col.isPinned
          );
          for (const pinnedCol of currentPinnedCollections) {
            batch.push(
              updateDoc(doc(db, "collections", pinnedCol.id), {
                isPinned: false,
                updatedAt: serverTimestamp(),
              })
            );
          }
        }

        // 대상 컬렉션의 핀 상태 설정
        batch.push(
          updateDoc(doc(db, "collections", collectionId), {
            isPinned: isPinned,
            updatedAt: serverTimestamp(),
          })
        );

        // 모든 업데이트 실행
        await Promise.all(batch);

        // 로컬 상태 업데이트
        set((state) => ({
          collections: state.collections
            .map((col) => {
              if (col.id === collectionId) {
                return { ...col, isPinned: isPinned, updatedAt: new Date() };
              } else if (isPinned && col.isPinned) {
                // 새로운 핀이 설정되면 기존 핀들 해제
                return { ...col, isPinned: false, updatedAt: new Date() };
              }
              return col;
            })
            .sort((a, b) => {
              // 핀된 컬렉션이 먼저 오도록 정렬
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              // 같은 핀 상태라면 이름순으로 정렬
              return a.name.localeCompare(b.name);
            }),
        }));
      } catch (error) {
        console.error("Error setting pin:", error);
        throw error;
      }
    },
  })
);
