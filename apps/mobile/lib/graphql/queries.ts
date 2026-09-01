export const ACTIVE_HUNTS_QUERY = `
  query ActiveHunts($first: Int!) {
    hunts(status: ACTIVE, first: $first, includePrivate: false) {
      id
      title
      description
      cluesCount
      status
      rewardType
      startTime
      endTime
      coverImageCid
      isPrivate
    }
  }
`;

export const HUNT_BY_ID_QUERY = `
  query HuntById($id: Int!) {
    hunt(id: $id) {
      id
      title
      description
      cluesCount
      status
      rewardType
      startTime
      endTime
      coverImageCid
      isPrivate
    }
  }
`;
