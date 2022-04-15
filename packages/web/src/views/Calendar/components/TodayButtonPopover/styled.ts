import { ColorNames } from "@web/common/types/styles";
import { getAlphaColor } from "@web/common/utils/colors";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";
import styled from "styled-components";

export const StyledTodayPopoverContainer = styled(Flex)`
  padding: 12px;
  background: ${getAlphaColor(ColorNames.DARK_1, 0.8)};
`;

export const TodayNavigationButton = styled(Text)`
  margin-left: 15px;

  &:hover {
    border-radius: 0;
  }
`;