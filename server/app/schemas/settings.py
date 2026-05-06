from pydantic import BaseModel, Field


class BrokerDailyLimits(BaseModel):
    enabled: bool = True
    target: float = Field(..., gt=0)
    max_loss: float = Field(..., lt=0)


class BrokerDailyLimitsRequest(BaseModel):
    enabled: bool = True
    target: float = Field(..., gt=0)
    max_loss: float


class BrokerSettingsSummary(BaseModel):
    id: str
    label: str
    enabled: bool
    daily_limits: BrokerDailyLimits


class BrokerSettingsResponse(BaseModel):
    brokers: list[BrokerSettingsSummary]


class BrokerDailyLimitsResponse(BaseModel):
    broker_id: str
    daily_limits: BrokerDailyLimits
